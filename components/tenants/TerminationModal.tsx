import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertCircle, X, Ban } from '../Icons';
import { useSettings } from '../../context/SettingsContext';

interface TerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (condition: string) => void;
  data: {
    tenantName: string;
    contractValue: number;
    rentDue: number;
    totalPaid: number;
    outstanding: number;
    deposit: number;
    refund: number;
  };
  isProcessing: boolean;
}

export default function TerminationModal({ isOpen, onClose, onConfirm, data, isProcessing }: TerminationModalProps) {
  const { formatCurrency } = useSettings();
  const [condition, setCondition] = useState("Good");
  
  if (!isOpen) return null;

  // Blocking if outstanding dues > 5 (small buffer for rounding)
  const isBlocking = data.outstanding > 5;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" style={{ zIndex: 100 }}>
       <Card className="w-full max-w-md shadow-2xl border-none animate-in fade-in-0 zoom-in-95">
          <CardHeader className={`border-b ${isBlocking ? 'bg-red-50' : 'bg-slate-50'}`}>
             <div className="flex justify-between items-center">
                <CardTitle className={`flex items-center gap-2 ${isBlocking ? 'text-red-700' : 'text-slate-800'}`}>
                   {isBlocking ? <AlertCircle className="w-5 h-5"/> : <Ban className="w-5 h-5"/>}
                   {isBlocking ? "Cannot Terminate" : "Terminate Contract"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5"/></Button>
             </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
             {isBlocking ? (
                 <div className="p-3 bg-red-100 border border-red-200 rounded-md text-sm text-red-800 flex gap-2 items-start">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Outstanding Dues Detected</strong>
                        <p className="mt-1">The tenant has unpaid rent. Please settle payments before terminating.</p>
                    </div>
                 </div>
             ) : (
                 <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
                    Review the final settlement details below.
                 </div>
             )}

             <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm border border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                    <span className="text-slate-600">Tenant</span>
                    <span className="font-medium text-slate-900">{data.tenantName}</span>
                </div>
                 <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                    <span className="text-slate-600">Contract Value</span>
                    <span className="font-medium text-slate-900">{formatCurrency(data.contractValue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                    <span className="text-slate-600">Prorated Rent (Calculated)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(data.rentDue)}</span>
                </div>
                 <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                    <span className="text-slate-600">Total Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(data.totalPaid)}</span>
                </div>
                
                {isBlocking ? (
                    <div className="flex justify-between py-2 bg-red-100 px-2 rounded font-bold text-red-700 mt-2 items-center">
                        <span>Outstanding Dues</span>
                        <span className="text-lg">{formatCurrency(data.outstanding)}</span>
                    </div>
                ) : (
                    <>
                         <div className="flex justify-between py-1 border-b border-slate-200 border-dashed">
                            <span className="text-slate-600">Security Deposit</span>
                            <span className="font-medium text-slate-900">{formatCurrency(data.deposit)}</span>
                        </div>
                        <div className="flex justify-between py-2 bg-green-100 px-2 rounded font-bold text-green-700 mt-2 items-center">
                            <span>Net Refund</span>
                            <span className="text-lg">{formatCurrency(data.refund)}</span>
                        </div>
                    </>
                )}
             </div>

             {!isBlocking && (
                 <div className="space-y-2 pt-2">
                    <Label htmlFor="condition">Unit Condition</Label>
                    <Input 
                        id="condition" 
                        value={condition} 
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="e.g. Good, Needs painting..."
                    />
                 </div>
             )}

          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-end gap-3">
             <Button variant="outline" onClick={onClose}>Close</Button>
             {!isBlocking && (
                 <Button variant="destructive" onClick={() => onConfirm(condition)} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Confirm Termination"}
                 </Button>
             )}
          </CardFooter>
       </Card>
    </div>
  );
}