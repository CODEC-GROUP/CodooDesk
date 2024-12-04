'use client'

import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent } from "@/components/Shared/ui/card"

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: "cash", name: "Cash Payment", description: "This payment method allows your customers pay in cash" },
  { id: "mtn", name: "MTN MOMO", description: "This payment method allows your customers pay in cash" },
  { id: "orange", name: "ORANGE MONEY", description: "This payment method allows your customers pay in cash" },
]

export function PaymentMethodSelection({
  onSelectMethod,
  onBack,
}: {
  onSelectMethod: (method: PaymentMethod) => void;
  onBack: () => void;
}) {
  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back
      </Button>
      <h1 className="text-3xl font-bold mb-8">Complete Payment</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {paymentMethods.map((method) => (
          <Card key={method.id} className="cursor-pointer hover:border-blue-500" onClick={() => onSelectMethod(method)}>
            <CardContent className="flex flex-col items-center justify-center h-full p-6">
              <div className="text-4xl mb-4">💵</div>
              <h2 className="text-xl font-semibold mb-2">{method.name}</h2>
              <p className="text-center text-gray-600">{method.description}</p>
              <Button className="mt-4 w-full">Activate</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
