"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Check, Plus, Search, Store } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

// Mock data for shops - in a real app, this would come from an API
const generateMockShops = (count = 20) => {
  const shopTypes = ["QuickBooks", "Shopify", "Etsy", "Amazon", "eBay", "Wix", "Squarespace", "WooCommerce"]

  return Array.from({ length: count }, (_, i) => ({
    id: (i + 1).toString(),
    name: `${shopTypes[i % shopTypes.length]} Shop ${i + 1}`,
    lastAccessed: i < 5 ? `${i + 1} days ago` : i < 10 ? `${i - 4} weeks ago` : "Never",
    logo: `/placeholder.svg?height=40&width=40&text=${shopTypes[i % shopTypes.length][0]}`,
  }))
}

const shops = generateMockShops(20)

export function ShopSelectionScreen() {
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  // Filter shops based on search
  const filteredShops = shops.filter((shop) => shop.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleShopSelect = (shopId: string) => {
    setSelectedShop(shopId)
  }

  const handleContinue = () => {
    if (selectedShop) {
      router.push(`/dashboard/${selectedShop}`)
    }
  }

  const handleAddShop = () => {
    // In a real app, this would navigate to a shop creation page or open a modal
    console.log("Add new shop")
    router.push("/create-shop")
  }

  return (
    <div className="container mx-auto max-w-6xl py-10 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Select a Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose which shop you want to manage</p>
      </div>

      {/* Simple search */}
      <div className="mb-6 relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search shops..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Shop grid */}
      {filteredShops.length === 0 && searchQuery !== "" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Store className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No shops found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {/* Add Shop Card - Always first in the grid */}
          <Card
            className="cursor-pointer border-dashed hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            onClick={handleAddShop}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center h-[100px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-2">
                <Plus className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">Add New Shop</p>
            </CardContent>
          </Card>

          {/* Shop Cards */}
          {filteredShops.map((shop) => (
            <Card
              key={shop.id}
              className={`cursor-pointer transition-colors ${
                selectedShop === shop.id ? "border-2 border-blue-500" : "hover:border-blue-200"
              }`}
              onClick={() => handleShopSelect(shop.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Image
                      src={shop.logo || "/placeholder.svg"}
                      alt={`${shop.name} logo`}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    {selectedShop === shop.id && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-medium truncate">{shop.name}</h3>
                    <p className="text-xs text-muted-foreground">Last accessed: {shop.lastAccessed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-center">
        <Button
          className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!selectedShop}
          onClick={handleContinue}
        >
          Continue with Selected Shop
        </Button>
      </div>
    </div>
  )
}
