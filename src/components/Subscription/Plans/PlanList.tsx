"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Check, X } from "lucide-react"
import { ComparePlans } from "@/components/Subscription/Plans/compare-plans"
import { PaymentMethodSelection } from "@/components/Subscription/Plans/payment-method-selection"
import { PaymentCompletion } from "@/components/Subscription/Plans/payment-completion"
import { useTranslation } from "react-i18next"


interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}


interface Plan {
  price: string;
  duration: string;
  description: string;
  features: string[];
  disabledFeatures: string[];
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    price: "14,900 XAF",
    duration: "3 MONTHS",
    description: "Start your business",
    features: [
      "Cloud Backup",
      "Order Tracking",
      "File Sharing",
      "24/7 Support",
      "Multi-Device",
    ],
    disabledFeatures: [
      "Analytics Reports",
      "Unlimited Storage",
      "Full Data Export",
    ],
  },
  {
    price: "49,0000 XAF",
    duration: "6 MONTHS",
    description: "Start your business",
    recommended: true,
    features: [
      "Cloud Backup",
      "Order Tracking",
      "File Sharing",
      "24/7 Support",
      "Up to 100 Products",
      "Chat Inbox",
    ],
    disabledFeatures: [
      "Unlimited Storage",
      "Multi-Device",
    ],
  },
  {
    price: "99,000 XAF",
    duration: "12 MONTHS",
    description: "Start your business",
    features: [
      "Cloud Backup",
      "Order Tracking",
      "File Sharing",
      "24/7 Support",
      "Up to 100 Products",
      "Chat Inbox",
      "Unlimited Storage",
      "Multi-Device",
    ],
    disabledFeatures: [],
  },
]

export function Subscription() {
  const [step, setStep] = useState("plans")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const { t } = useTranslation()

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
  }

  const handleSelectPaymentMethod = (method: PaymentMethod): void => {
    setSelectedPaymentMethod(method)
    setStep("complete")
  }

  const handleNext = () => {
    if (selectedPlan) {
      setStep("payment")
    } else {
      alert("Please select a plan before proceeding.")
    }
  }

  return (
    <div className="container mx-auto py-10">
      {step === "plans" && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Choose a Plan</h1>
            <div>
              <Button variant="outline" className="mr-2" onClick={() => setShowComparison(!showComparison)}>
                {showComparison ? "Hide Comparison" : "Compare Plans"}
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </div>
          <p className="text-center text-gray-600 mb-8">
            Familiarize yourself with the payment plans below.
            <br />
            Pick best pricing plan to fit your needs.
          </p>
          {showComparison ? (
            <ComparePlans />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`${plan.recommended ? "border-blue-500 border-2" : ""} ${selectedPlan === plan ? "ring-2 ring-blue-500" : ""}`}
                >
                  {plan.recommended && (
                    <div className="bg-blue-500 text-white text-center py-1 text-sm font-semibold">
                      Recommended
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-3xl font-bold">{plan.price}</CardTitle>
                    <CardDescription className="text-xl font-semibold">{plan.duration}</CardDescription>
                    <p className="text-gray-600">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                      {plan.disabledFeatures.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-gray-400">
                          <X className="h-5 w-5 text-gray-400 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-4"
                      variant={plan.recommended ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {selectedPlan === plan ? "Selected" : "Select Plan"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <p className="text-center text-gray-600 mt-8">
            Cancel or upgrade your plan anytime
          </p>
        </>
      )}

      {step === "payment" && (
        <PaymentMethodSelection 
          onSelectMethod={handleSelectPaymentMethod}
          onBack={() => setStep("plans")}
        />
      )}

      {step === "complete" && selectedPaymentMethod && (
        <PaymentCompletion
          selectedMethod={selectedPaymentMethod}
          onBack={() => setStep("payment")}
        />
      )}
    </div>
  )
}
