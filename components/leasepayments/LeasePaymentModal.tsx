
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { X, Save } from "../Icons";
import { LeasePayment, Property } from "../../types";

interface LeasePaymentModalProps {
  payment: LeasePayment;
  property?: Property;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  isProcessing: boolean;
}

export default function LeasePaymentModal({ payment, property, onClose, onSubmit, isProcessing }: LeasePaymentModalProps) {
  const balance = payment.amount - (payment.paid_amount || 0);
  const [paymentAmount, setPaymentAmount] = useState(balance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount > 0 && paymentAmount <= balance) {
      onSubmit(paymentAmount);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="bg-slate-50 border-b"><div className="flex justify-between items-center"><CardTitle>Record Lease Payment</CardTitle><Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button></div></CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4"><p className="text-sm font-medium text-purple-900">Property: <span className="font-bold">{property?.name}</span></p></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Total Amount:</span><span className="font-semibold">SAR {payment.amount?.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600">Already Paid:</span><span className="font-semibold text-green-600">SAR {(payment.paid_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm border-t border-blue-300 pt-2"><span className="text-slate-600">Balance Due:</span><span className="font-bold text-red-600">SAR {balance.toLocaleString()}</span></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_amount">Payment Amount (SAR) *</Label>
              <Input id="payment_amount" type="number" min="0" max={balance} step="0.01" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} required/>
              <p className="text-xs text-slate-500">Maximum: SAR {balance.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentAmount(balance / 2)}>Half</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentAmount(balance)}>Full Amount</Button>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isProcessing}><Save className="w-4 h-4 mr-2" />{isProcessing ? 'Processing...' : 'Record Payment'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
