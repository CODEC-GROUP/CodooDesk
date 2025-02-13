'use client'

import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { useAppTranslation } from "@/hooks/useAppTranslation"

export function PaymentCompletion({ selectedMethod, onBack }: { selectedMethod: any; onBack: () => void }) {
  const { t } = useAppTranslation();
  
  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← {t('common.actions.back')}
      </Button>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            {t('common.actions.logo', { method: selectedMethod })}
          </CardTitle>
          <CardDescription className="text-center">
            {selectedMethod} Payment
            <span className="text-blue-500 cursor-pointer" onClick={onBack}> Change Payment method</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="momo-number" className="block text-sm font-medium text-gray-700">
                {t('payments.momo.label')}
              </label>
              <Input id="momo-number" placeholder={t('payments.momo.placeholder')} />
            </div>
            <Button className="w-full">{t('common.actions.pay')}</Button>
            <p className="text-center text-sm text-gray-500">
              🔒 {t('common.actions.secured')}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
