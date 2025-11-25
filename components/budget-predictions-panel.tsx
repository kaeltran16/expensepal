'use client'

import { Button } from '@/components/ui/button'
import { getDismissedAlerts, useBudgetPredictions, useDismissAlert } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useMemo } from 'react'

export function BudgetPredictionsPanel() {
  const {
    data,
    isLoading,
    error,
  } = useBudgetPredictions()

  const dismissMutation = useDismissAlert()

  const dismissedAlerts = useMemo(() => getDismissedAlerts(), [])

  const visibleAlerts = useMemo(() => {
    if (!data?.alerts) return []
    return data.alerts.filter((alert) => !dismissedAlerts.includes(alert.id))
  }, [data?.alerts, dismissedAlerts])

  if (isLoading) {
    return (
      <div className="ios-card p-6">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const { predictions, savingsOpportunities } = data

  // Show summary if there are predictions
  const criticalPredictions = predictions.filter(
    (p) => p.status === 'exceeded' || p.status === 'danger'
  )

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`ios-card p-4 border-l-4 ${
                    alert.severity === 'critical'
                      ? 'border-l-destructive bg-destructive/5'
                      : alert.severity === 'warning'
                        ? 'border-l-yellow-500 bg-yellow-500/5'
                        : 'border-l-blue-500 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {alert.severity === 'critical' && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      {alert.severity === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                      {alert.severity === 'info' && (
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="ios-headline mb-1">{alert.title}</h4>
                      <p className="ios-caption text-muted-foreground">
                        {alert.message}
                      </p>
                      {alert.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 h-8 text-xs"
                        >
                          {alert.action.label}
                        </Button>
                      )}
                    </div>

                    {/* Dismiss */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-6 w-6 p-0"
                      onClick={() => dismissMutation.mutate(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Predictions Summary */}
      {predictions.length > 0 && (
        <div className="ios-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="ios-headline">Monthly Predictions</h3>
            <span className="text-xs text-muted-foreground">
              {new Date().getDate()} days in
            </span>
          </div>

          <div className="space-y-2">
            {predictions.slice(0, 5).map((pred) => (
              <div
                key={pred.category}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      pred.status === 'exceeded'
                        ? 'bg-destructive'
                        : pred.status === 'danger'
                          ? 'bg-yellow-500'
                          : pred.status === 'warning'
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                    }`}
                  />
                  <span className="ios-body truncate">{pred.category}</span>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="ios-caption text-muted-foreground">
                    {pred.percentageUsed.toFixed(0)}% used
                  </div>
                  {pred.status === 'danger' && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{formatCurrency(pred.predictedOverage, 'VND')}
                    </div>
                  )}
                  {pred.status === 'safe' && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {formatCurrency(pred.budget - pred.currentSpent, 'VND')} left
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings Opportunities */}
      {savingsOpportunities.length > 0 && (
        <div className="ios-card p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <h3 className="ios-headline text-green-900 dark:text-green-100">
              Savings Opportunities
            </h3>
          </div>

          <div className="space-y-3">
            {savingsOpportunities.slice(0, 2).map((opp) => (
              <div
                key={opp.category}
                className="bg-white dark:bg-gray-900 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="ios-headline">{opp.category}</span>
                  <span className="text-sm font-semibold text-green-600">
                    Save {formatCurrency(opp.potentialSavings, 'VND')}/year
                  </span>
                </div>
                <p className="ios-caption text-muted-foreground">
                  {opp.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear state */}
      {visibleAlerts.length === 0 && criticalPredictions.length === 0 && (
        <div className="ios-card p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <h3 className="ios-headline mb-1">All budgets on track!</h3>
          <p className="ios-caption text-muted-foreground">
            You're managing your spending well this month.
          </p>
        </div>
      )}
    </div>
  )
}
