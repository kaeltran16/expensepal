import { withAuth } from '@/lib/api/middleware'
import { llmService } from '@/lib/llm-service'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface GenerateWorkoutRequest {
  duration: number // minutes
  equipment: string[] // e.g., ['barbell', 'dumbbells', 'cable']
  muscleGroups: string[] // e.g., ['chest', 'shoulders', 'triceps']
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  workoutType?: 'strength' | 'hypertrophy' | 'endurance'
}

interface GeneratedExercise {
  exercise_id: string
  name: string
  sets: number
  reps: string
  rest: number
  notes?: string
}

// POST /api/workouts/generate - generate a personalized workout using AI
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body: GenerateWorkoutRequest = await request.json()

  const { duration, equipment, muscleGroups, difficulty, workoutType = 'hypertrophy' } = body

  // Validate inputs
  if (!duration || duration < 15 || duration > 120) {
    return NextResponse.json({ error: 'Duration must be between 15 and 120 minutes' }, { status: 400 })
  }

  if (!muscleGroups || muscleGroups.length === 0) {
    return NextResponse.json({ error: 'At least one muscle group is required' }, { status: 400 })
  }

  // Fetch available exercises from database
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, category, muscle_groups, equipment, difficulty, image_url, gif_url, thumbnail_url')
    .order('name')

  if (exercisesError || !exercises) {
    console.error('Error fetching exercises:', exercisesError)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }

  // Filter exercises based on equipment and muscle groups
  const availableExercises = exercises.filter(ex => {
    // Check if exercise targets any of the requested muscle groups
    const targetsMuscle = muscleGroups.some(mg =>
      ex.muscle_groups?.some((emg: string) =>
        emg.toLowerCase().includes(mg.toLowerCase()) ||
        mg.toLowerCase().includes(emg.toLowerCase())
      )
    )

    // Check if user has required equipment (or exercise is bodyweight)
    const hasEquipment = !ex.equipment ||
      ex.equipment.toLowerCase() === 'body only' ||
      ex.equipment.toLowerCase() === 'bodyweight' ||
      equipment.some(eq => ex.equipment?.toLowerCase().includes(eq.toLowerCase()))

    return targetsMuscle && hasEquipment
  })

  if (availableExercises.length < 3) {
    return NextResponse.json({
      error: 'Not enough exercises found for the selected criteria. Try adding more equipment or muscle groups.',
    }, { status: 400 })
  }

  // Build prompt for LLM
  const systemPrompt = `You are a professional fitness coach specializing in strength training program design.
You create effective, safe workout routines tailored to the user's goals and constraints.
Always prioritize compound movements and proper exercise order (larger muscle groups first).
Include warm-up considerations in your exercise selection.`

  const exerciseList = availableExercises
    .map(ex => `- ${ex.name} (ID: ${ex.id}, targets: ${ex.muscle_groups?.join(', ')}, equipment: ${ex.equipment || 'none'})`)
    .join('\n')

  const userPrompt = `Generate a ${duration}-minute ${workoutType} workout for someone at ${difficulty} level.

Target muscle groups: ${muscleGroups.join(', ')}
Available equipment: ${equipment.length > 0 ? equipment.join(', ') : 'bodyweight only'}

Available exercises (ONLY use exercises from this list):
${exerciseList}

Requirements:
- Select 4-8 exercises total (fewer for shorter workouts)
- Order exercises optimally (compound before isolation)
- Include appropriate sets/reps for ${workoutType} training:
  - Strength: 3-5 sets of 3-6 reps, 2-3 min rest
  - Hypertrophy: 3-4 sets of 8-12 reps, 60-90 sec rest
  - Endurance: 2-3 sets of 15-20 reps, 30-60 sec rest
- Total workout time should be approximately ${duration} minutes

Respond with ONLY a JSON object in this exact format:
{
  "name": "Workout name",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "exercise_id": "uuid from the list above",
      "name": "exercise name",
      "sets": 3,
      "reps": "8-12",
      "rest": 90,
      "notes": "optional form tips"
    }
  ],
  "estimated_duration": ${duration},
  "warmup_notes": "Suggested warmup"
}`

  // Call LLM
  const response = await llmService.completion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1500,
  })

  if (!response?.content) {
    return NextResponse.json({ error: 'Failed to generate workout. Please try again.' }, { status: 500 })
  }

  // Parse response
  const generatedWorkout = llmService.parseJSON<{
    name: string
    description: string
    exercises: GeneratedExercise[]
    estimated_duration: number
    warmup_notes: string
  }>(response.content)

  if (!generatedWorkout || !generatedWorkout.exercises) {
    console.error('Failed to parse LLM response:', response.content)
    return NextResponse.json({ error: 'Failed to parse generated workout' }, { status: 500 })
  }

  // Validate that all exercise IDs exist
  const validExerciseIds = new Set(exercises.map(e => e.id))
  const validatedExercises = generatedWorkout.exercises.filter(ex =>
    validExerciseIds.has(ex.exercise_id)
  )

  if (validatedExercises.length === 0) {
    return NextResponse.json({ error: 'Generated workout contains no valid exercises' }, { status: 500 })
  }

  // Enrich exercises with image URLs
  const enrichedExercises = validatedExercises.map(ex => {
    const fullExercise = exercises.find(e => e.id === ex.exercise_id)
    return {
      ...ex,
      image_url: (fullExercise as any)?.image_url || null,
      gif_url: (fullExercise as any)?.gif_url || null,
    }
  })

  return NextResponse.json({
    workout: {
      name: generatedWorkout.name,
      description: generatedWorkout.description,
      exercises: enrichedExercises,
      estimated_duration: generatedWorkout.estimated_duration,
      warmup_notes: generatedWorkout.warmup_notes,
      difficulty,
    },
  })
})
