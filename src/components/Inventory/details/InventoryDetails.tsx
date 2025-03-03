'use client'

import React, { useState } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { StockMovementTable } from "@/components/Inventory/stock-movement/StockMovementTable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Shared/ui/tabs"
import { ArrowLeft, Save } from "lucide-react"
import { InventoryItemWithDetails } from "@/types/inventory"

interface InventoryDetailsProps {
  item: InventoryItemWithDetails;
  onBack: () => void;
  onItemUpdated: (item: InventoryItemWithDetails) => void;
}

const InventoryDetails: React.FC<InventoryDetailsProps> = ({ item, onBack, onItemUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold flex-1">Inventory Item Details</h1>
        <div className="space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                onItemUpdated(editedItem);
                setIsEditing(false);
              }}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Item
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
          <TabsTrigger value="stock-movement">Stock Movement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic-info">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Name</Label>
                    {isEditing ? (
                      <Input 
                        value={editedItem.product.name} 
                        onChange={(e) => setEditedItem({
                          ...editedItem,
                          product: {
                            ...editedItem.product,
                            name: e.target.value
                          }
                        })}
                      />
                    ) : (
                      <div className="mt-1">{item.product.name}</div>
                    )}
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <div className="mt-1">{item.product.sku}</div>
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea 
                      value={editedItem.product.description || ''} 
                      onChange={(e) => setEditedItem({
                        ...editedItem,
                        product: {
                          ...editedItem.product,
                          description: e.target.value
                        }
                      })}
                    />
                  ) : (
                    <div className="mt-1">{item.product.description || 'No description available'}</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={editedItem.quantity} 
                        onChange={(e) => setEditedItem({
                          ...editedItem,
                          quantity: parseInt(e.target.value)
                        })}
                      />
                    ) : (
                      <div className="mt-1">{item.quantity}</div>
                    )}
                  </div>
                  <div>
                    <Label>Unit Cost</Label>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={editedItem.unit_cost || 0} 
                        onChange={(e) => setEditedItem({
                          ...editedItem,
                          unit_cost: parseFloat(e.target.value)
                        })}
                      />
                    ) : (
                      <div className="mt-1">{(item?.unit_cost || 0).toLocaleString()} FCFA</div>
                    )}
                  </div>
                  <div>
                    <Label>Selling Price</Label>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={editedItem.selling_price || 0} 
                        onChange={(e) => setEditedItem({
                          ...editedItem,
                          selling_price: parseFloat(e.target.value)
                        })}
                      />
                    ) : (
                      <div className="mt-1">{(item?.selling_price || 0).toLocaleString()} FCFA</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-movement">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              <StockMovementTable inventoryId={item.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryDetails;
