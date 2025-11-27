import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { X, Save, Loader2 } from '../Icons';
import { Contract } from '../../types';
import { format, addHijriYears } from '../../utils/helpers';
import { DatePickerWithHijri } from '../ui/DatePickerWithHijri';

interface RenewContractModalProps {
  contract: Contract;
  onClose: () => void;
  onSubmit: (data: { contract: Contract, newRent: number, newEndDate: string, newFrequency: Contract['payment_frequency'] }) => void;
  isProcessing: boolean;
}

const getNewEndDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const newDate = addHijriYears(date, 1);
    return format(newDate, 'yyyy-MM-dd');
};

export default function RenewContractModal({ contract, onClose, onSubmit, isProcessing }: RenewContractModalProps) {
    const [newRent, setNewRent] = useState<number>(0);
    const [newEndDate, setNewEndDate] = useState(getNewEndDate(contract.end_date));
    const [newFrequency, setNewFrequency] = useState<Contract['payment_frequency']>(contract.payment_frequency);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ contract, newRent, newEndDate, newFrequency });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="bg-slate-50 border-b">
                    <div className="flex justify-between items-center">
                        <CardTitle>Renew Contract</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4 pt-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                           <p>Current contract ends on: <strong>{format(new Date(contract.end_date), 'MMM d, yyyy')}</strong></p>
                        </div>
                        
                        <DatePickerWithHijri
                            label="New Contract End Date *"
                            id="new_end_date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            required
                        />
                        
                        <div className="space-y-2">
                            <Label htmlFor="payment_frequency">Payment Frequency *</Label>
                            <Select value={newFrequency} onChange={(e) => setNewFrequency(e.target.value as Contract['payment_frequency'])}>
                                <option value="yearly">Yearly</option>
                                <option value="6_months">6 months</option>
                                <option value="3_months">3 months</option>
                                <option value="monthly">Monthly</option>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new_rent">New Rent for upcoming period (SAR) *</Label>
                            <Input
                                id="new_rent"
                                type="number"
                                min="0"
                                step="0.01"
                                value={newRent || ''}
                                onChange={(e) => setNewRent(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                required
                            />
                            <p className="text-xs text-slate-500">Enter the total rent for the new period.</p>
                        </div>

                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="ml-2">{isProcessing ? 'Renewing...' : 'Renew & Generate Invoices'}</span>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}