"use client"

import React, { useEffect, useState } from "react"
import { API } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import toast from "react-hot-toast"

dayjs.extend(utc)
dayjs.extend(timezone)

// Types
interface RefundRequest {
  id: number
  booking_id: number
  reason: string
  description?: string
  amount_requested: number
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'processed'
  admin_notes?: string
  processed_at?: string
  created_at: string
  updated_at: string
  booking?: {
    id: number
    booking_reference: string
    service_name: string
    start_at: string
    user?: {
      name: string
      email: string
      phone_number: string
    }
    payment_data?: {
      stripe_payment_intent_id?: string
    }
  }
}

export function RefundRequestsSection() {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("pending")

  // Review dialog states
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [processing, setProcessing] = useState(false)

  // Fetch refund requests
  const fetchRefundRequests = async () => {
    try {
      setLoading(true)
      const response = await API.get('/refund-requests', {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          page: 1,
          limit: 100
        }
      })

      if (response.data.success) {
        setRefundRequests(response.data.data.refund_requests || [])
      } else {
        console.error('Failed to fetch refund requests:', response.data)
      }
    } catch (error) {
      console.error('Error fetching refund requests:', error)
      toast.error('Failed to load refund requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRefundRequests()
  }, [statusFilter])

  // Handle approve refund request
  const handleApproveRequest = async () => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      // Step 1: Process Stripe refund
      if (selectedRequest.booking?.payment_data?.stripe_payment_intent_id) {
        const refundResponse = await API.post(
          `/payments/${selectedRequest.booking.payment_data.stripe_payment_intent_id}/refund`,
          {
            reason: selectedRequest.reason,
            amount: selectedRequest.amount_requested * 100 // Convert to cents
          }
        )

        if (!refundResponse.data.success) {
          throw new Error(refundResponse.data.message || 'Stripe refund failed')
        }
      }

      // Step 2: Update refund request status
      const updateResponse = await API.patch(`/refund-requests/${selectedRequest.id}`, {
        status: 'processed',
        admin_notes: adminNotes
      })

      if (updateResponse.data.success) {
        toast.success('Refund approved and processed successfully!')
        setShowReviewDialog(false)
        setSelectedRequest(null)
        setAdminNotes("")
        fetchRefundRequests()
      } else {
        throw new Error(updateResponse.data.message || 'Failed to update refund request')
      }
    } catch (error: any) {
      console.error('Error approving refund:', error)
      toast.error(error.message || 'Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  // Handle reject refund request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      const response = await API.patch(`/refund-requests/${selectedRequest.id}`, {
        status: 'rejected',
        admin_notes: adminNotes
      })

      if (response.data.success) {
        toast.success('Refund request rejected')
        setShowReviewDialog(false)
        setSelectedRequest(null)
        setAdminNotes("")
        fetchRefundRequests()
      } else {
        throw new Error(response.data.message || 'Failed to update refund request')
      }
    } catch (error: any) {
      console.error('Error rejecting refund:', error)
      toast.error(error.message || 'Failed to reject refund request')
    } finally {
      setProcessing(false)
    }
  }

  const openReviewDialog = (request: RefundRequest) => {
    setSelectedRequest(request)
    setAdminNotes(request.admin_notes || "")
    setShowReviewDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'under_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Under Review</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>
      case 'processed':
        return <Badge variant="default" className="bg-green-600">Processed</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDateTime = (dateTime: string) => {
    return dayjs(dateTime).tz("Australia/Melbourne").format("MMM D, YYYY h:mm A")
  }

  const filteredRequests = refundRequests

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Refund Requests
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No refund requests</h3>
            <p className="text-gray-500">
              {statusFilter === "all"
                ? "There are no refund requests yet."
                : `No ${statusFilter} refund requests found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.booking?.booking_reference || `#${request.booking_id}`}</div>
                      <div className="text-sm text-gray-500">{request.booking?.service_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{request.booking?.user?.name}</div>
                        <div className="text-gray-500">{request.booking?.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">${request.amount_requested.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm capitalize max-w-[200px]">
                        {request.reason.replace(/_/g, ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(request.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' || request.status === 'under_review' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReviewDialog(request)}
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReviewDialog(request)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Review Dialog */}
    <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Refund Request</DialogTitle>
          <DialogDescription>
            Review and process this refund request
          </DialogDescription>
        </DialogHeader>

        {selectedRequest && (
          <div className="space-y-6">
            {/* Booking Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Booking Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Booking Reference:</span>
                  <div className="font-medium">{selectedRequest.booking?.booking_reference}</div>
                </div>
                <div>
                  <span className="text-gray-600">Service:</span>
                  <div className="font-medium">{selectedRequest.booking?.service_name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <div className="font-medium">{selectedRequest.booking?.user?.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="font-medium">{selectedRequest.booking?.user?.email}</div>
                </div>
              </div>
            </div>

            {/* Refund Details */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Refund Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Requested:</span>
                  <span className="font-bold text-lg">${selectedRequest.amount_requested.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason:</span>
                  <span className="font-medium capitalize">{selectedRequest.reason.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submitted:</span>
                  <span>{formatDateTime(selectedRequest.created_at)}</span>
                </div>
                {selectedRequest.description && (
                  <div>
                    <span className="text-gray-600">Customer Description:</span>
                    <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="border-t pt-4">
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this refund request..."
                rows={3}
                disabled={processing || (selectedRequest.status !== 'pending' && selectedRequest.status !== 'under_review')}
                className="mt-2"
              />
            </div>

            {/* Actions */}
            {(selectedRequest.status === 'pending' || selectedRequest.status === 'under_review') ? (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewDialog(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectRequest}
                  disabled={processing}
                >
                  {processing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : (
                    <><XCircle className="mr-2 h-4 w-4" />Reject</>
                  )}
                </Button>
                <Button
                  onClick={handleApproveRequest}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : (
                    <><CheckCircle className="mr-2 h-4 w-4" />Approve & Process Refund</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewDialog(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
