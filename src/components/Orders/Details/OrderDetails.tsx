'use client'

import { Button } from "@/components/Shared/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent } from "@/components/Shared/ui/card"

interface OrderDetailsProps {
  orderId: string;
  onBack: () => void;
}

export function OrderDetails({ orderId, onBack }: OrderDetailsProps) {
  const order = {
    id: orderId,
    customer: "John CYRIL",
    date: "Sept 18, 2024",
    items: [
      { name: "Product A", quantity: 2, price: "2,000 XAF", total: "4,000 XAF" },
      { name: "Product B", quantity: 1, price: "6,000 XAF", total: "6,000 XAF" },
    ],
    subtotal: "10,000 XAF",
    discount: "0 XAF",
    tax: "0%",
    total: "10,000 XAF",
    amountPaid: "10,000 XAF",
    changeGiven: "3,000 XAF",
    netAmountPaid: "7,000 XAF",
    salesperson: "Ngwa Mildred",
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Order #${order.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header, .footer { text-align: center; }
              .content { margin-top: 20px; }
              .table { width: 100%; border-collapse: collapse; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; }
              .table th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="/assets/images/new-logo.jpeg" alt="Business Logo" style="height: 50px; width: 50px;"/>
              <h1>PlayStore</h1>
              <p>123 Business Street</p>
              <p>City, State 12345</p>
              <p>Phone: (123) 456-7890</p>
              <h2>Invoice #${order.id}</h2>
            </div>
            <div class="content">
              <p>Customer: ${order.customer}</p>
              <p>Order Date: ${order.date}</p>
              <table class="table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Price Per Item</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>${item.price}</td>
                      <td>${item.total}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p>Subtotal: ${order.subtotal}</p>
              <p>Discount: ${order.discount}</p>
              <p>Tax: ${order.tax}</p>
              <p>Total: ${order.total}</p>
              <p>Amount Paid: ${order.amountPaid}</p>
              <p>Change Given: ${order.changeGiven}</p>
              <p>Net Amount Paid: ${order.netAmountPaid}</p>
              <p>Salesperson: ${order.salesperson}</p>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="bg-white rounded-lg shadow-sm">
        <CardContent className="p-6">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost"
              onClick={onBack}
              className="mr-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Order Details</h1>
          </div>

          {/* Business Info and Order Details */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xl font-bold mb-2">Invoice #{order.id}</h2>
              <div className="space-y-1 text-gray-600">
                <p>Customer: <span className="font-medium">{order.customer}</span></p>
                <p>Order Date: <span className="font-medium">{order.date}</span></p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end mb-2">
                <img 
                  src="/assets/images/new-logo.jpeg" 
                  alt="Business Logo" 
                  className="h-8 w-8 mr-2"
                />
                <h2 className="text-xl font-bold">PlayStore</h2>
              </div>
              <div className="text-gray-600">
                <p>123 Business Street</p>
                <p>City, State 12345</p>
                <p>Phone: (123) 456-7890</p>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-y-auto max-h-[400px]"> {/* Added scrollable area */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price Per Item</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell className="text-right">{item.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-between">
            <div>
              <p className="font-semibold">Salesperson: {order.salesperson}</p>
              <p className="mt-4 text-gray-600">Amount Paid: {order.amountPaid}</p>
              <p className="text-gray-600">Change Given: {order.changeGiven}</p>
              <p className="text-gray-600">Net Amount Paid: {order.netAmountPaid}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Subtotal: {order.subtotal}</p>
              <p className="text-gray-600">Discount: {order.discount}</p>
              <p className="text-gray-600">Tax: {order.tax}</p>
              <p className="font-semibold text-lg mt-2">Total: {order.total}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <Button variant="outline" onClick={handlePrint}>Print</Button>
            <Button>Download</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}