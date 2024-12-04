"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Shared/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Shared/ui/dialog"
import { Label } from "@/components/Shared/ui/label"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/Shared/ui/select"
import { Textarea } from "@/components/Shared/ui/textarea"
import { ArrowRightLeft, Settings } from "lucide-react"
import { Plus, Pencil, Trash2 } from "lucide-react"

export const TreasuryAccountTypes = {
  CASH: "Cash",
  BANK: "Bank",
  MOBILE_MONEY: "Mobile Money",
  PAYPAL: "PayPal",
  CREDIT: "Credit",
  DEBIT: "Debit",
  CRYPTO: "Cryptocurrency",
  OTHER: "Other"
} as const

type Account = {
  id: string
  name: string
  type: keyof typeof TreasuryAccountTypes
  number: string
  openingBalance: number
  recurringBalance: number
  description?: string
}

export default function BlockPage() {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: "1", name: "Main Cash Register", type: "CASH", number: "CASH-001", openingBalance: 10000, recurringBalance: 12000, description: "Main store cash register" },
    { id: "2", name: "MTN MoMo Business", type: "MOBILE_MONEY", number: "237670000000", openingBalance: 5000, recurringBalance: 5500, description: "Business mobile money account" },
    { id: "3", name: "Orange Money", type: "MOBILE_MONEY", number: "1122334455", openingBalance: 2000, recurringBalance: 1800, description: "Personal mobile money account" },
  ])

  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "CASH" as keyof typeof TreasuryAccountTypes,
    number: "",
    openingBalance: 0,
    recurringBalance: 0,
    description: ""
  })

  const [transferDetails, setTransferDetails] = useState({
    fromAccount: "",
    toAccount: "",
    amount: 0,
    description: ""
  })

  const [settings, setSettings] = useState({
    defaultExpenseAccount: "",
    defaultCreditAccount: "",
    defaultPaymentAccount: "",
  })

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  const handleAddAccount = () => {
    setAccounts([...accounts, { ...newAccount, id: Date.now().toString() }])
    setNewAccount({ name: "", type: "CASH" as keyof typeof TreasuryAccountTypes, number: "", openingBalance: 0, recurringBalance: 0, description: "" })
  }

  const handleTransfer = () => {
    const updatedAccounts = accounts.map(account => {
      if (account.id === transferDetails.fromAccount) {
        return { ...account, recurringBalance: account.recurringBalance - transferDetails.amount }
      }
      if (account.id === transferDetails.toAccount) {
        return { ...account, recurringBalance: account.recurringBalance + transferDetails.amount }
      }
      return account
    })
    setAccounts(updatedAccounts)
    setTransferDetails({ fromAccount: "", toAccount: "", amount: 0, description: "" })
  }

  const handleSettingsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value })
  }

  const toggleAccountSelection = (id: string) => {
    if (selectedAccounts.includes(id)) {
      setSelectedAccounts(selectedAccounts.filter(accountId => accountId !== id))
    } else {
      setSelectedAccounts([...selectedAccounts, id])
    }
  }

  const openOverlay = (account: Account) => {
    // Implement overlay logic here
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Treasury Management</CardTitle>
            <CardDescription>Manage your accounts and balances</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new treasury account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="accountName" className="text-right">
                      Account Name
                    </Label>
                    <Input
                      id="accountName"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="accountType" className="text-right">
                      Account Type
                    </Label>
                    <Select
                      onValueChange={(value: keyof typeof TreasuryAccountTypes) => setNewAccount({ ...newAccount, type: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TreasuryAccountTypes).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="accountNumber" className="text-right">
                      Number
                    </Label>
                    <Input
                      id="accountNumber"
                      value={newAccount.number}
                      onChange={(e) => setNewAccount({ ...newAccount, number: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="openingBalance" className="text-right">
                      Opening Balance
                    </Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={newAccount.openingBalance}
                      onChange={(e) => setNewAccount({ ...newAccount, openingBalance: Number(e.target.value), recurringBalance: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newAccount.description}
                      onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddAccount}>Add Account</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Treasury Settings</DialogTitle>
                  <DialogDescription>
                    Configure default accounts for different transaction types
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="defaultExpense" className="text-right">
                      Default Expense
                    </Label>
                    <Select
                      value={settings.defaultExpenseAccount}
                      onValueChange={(value) => 
                        setSettings({ ...settings, defaultExpenseAccount: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select default expense account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({TreasuryAccountTypes[account.type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="defaultCredit" className="text-right">
                      Default Credit
                    </Label>
                    <Select
                      value={settings.defaultCreditAccount}
                      onValueChange={(value) => 
                        setSettings({ ...settings, defaultCreditAccount: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select default credit account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({TreasuryAccountTypes[account.type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="defaultPayment" className="text-right">
                      Default Payment
                    </Label>
                    <Select
                      value={settings.defaultPaymentAccount}
                      onValueChange={(value) => 
                        setSettings({ ...settings, defaultPaymentAccount: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select default payment account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({TreasuryAccountTypes[account.type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    console.log('Settings saved:', settings)
                  }}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Transfer Funds</DialogTitle>
                  <DialogDescription>
                    Move funds between your accounts.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fromAccount" className="text-right">
                      From
                    </Label>
                    <select
                      id="fromAccount"
                      className="col-span-3"
                      value={transferDetails.fromAccount}
                      onChange={(e) => setTransferDetails({ ...transferDetails, fromAccount: e.target.value })}
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {account.number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="toAccount" className="text-right">
                      To
                    </Label>
                    <select
                      id="toAccount"
                      className="col-span-3"
                      value={transferDetails.toAccount}
                      onChange={(e) => setTransferDetails({ ...transferDetails, toAccount: e.target.value })}
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {account.number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      className="col-span-3"
                      value={transferDetails.amount}
                      onChange={(e) => setTransferDetails({ ...transferDetails, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transferDescription" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="transferDescription"
                      className="col-span-3"
                      value={transferDetails.description}
                      onChange={(e) => setTransferDetails({ ...transferDetails, description: e.target.value })}
                      placeholder="Enter transfer description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleTransfer}>Transfer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedAccounts.length === accounts.length}
                      onCheckedChange={() => {
                        if (selectedAccounts.length === accounts.length) {
                          setSelectedAccounts([])
                        } else {
                          setSelectedAccounts(accounts.map(account => account.id))
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={() => toggleAccountSelection(account.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{TreasuryAccountTypes[account.type]}</TableCell>
                    <TableCell>{account.number}</TableCell>
                    <TableCell>{account.description}</TableCell>
                    <TableCell>{account.openingBalance.toLocaleString()} XAF</TableCell>
                    <TableCell>{account.recurringBalance.toLocaleString()} XAF</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openOverlay(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}