"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, DollarSign } from "lucide-react"
import { API } from "@/lib/api-client"
import toast from "react-hot-toast"

interface Booking {
  id: number
  booking_reference: string
  price_cents: number
  deposit_paid_cents: number
  payment_status: string
  payment_data?: {
    stripe_payment_intent_id?: string
    stripe_charge_id?: string
    stripe_receipt_url?: string
  }
}

interface RefundBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Booking | null
  onSuccess: () => void
}

export function RefundBookingDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: RefundBookingDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [refundReason, setRefundReason] = useState("requested_by_customer")
  const [error, setError] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!booking || !booking.payment_data?.stripe_payment_intent_id) {
      setError("No payment information found for this booking")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await API.post(
        `/payments/${booking.payment_data.stripe_payment_intent_id}/refund`,
        { reason: refundReason }
      )

      if (response.data.success) {
        toast.success("Refund processed successfully!")
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(response.data.message || "Refund failed")
      }
    } catch (err: any) {
      console.error("Refund error:", err)
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to process refund. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!booking) return null

  const canRefund =
    booking.payment_status === "deposit_paid" ||
    booking.payment_status === "fully_paid"

  const refundAmount = booking.deposit_paid_cents || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund Booking</DialogTitle>
          <DialogDescription>
            Process a refund for booking {booking.booking_reference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Refund Amount Display */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Refund Amount</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Deposit paid amount
                </p>
              </div>
              <div className="flex items-center gap-1 text-2xl font-bold text-blue-900">
                <DollarSign className="h-5 w-5" />
                {(refundAmount / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Refund Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Refund Reason</label>
            <Select value={refundReason} onValueChange={setRefundReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                <SelectItem value="duplicate">Duplicate booking</SelectItem>
                <SelectItem value="fraudulent">Fraudulent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          {!canRefund ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This booking cannot be refunded. Only bookings with "deposit_paid" or "fully_paid" status can be refunded.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will refund the full deposit amount and cancel the booking. This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={isProcessing || !canRefund}
              variant="destructive"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Refund"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
