import React, { useState } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { X, Save, Loader2 } from "../Icons";
import { format, addHijriMonths } from "../../utils/helpers";
import { Tenant, Unit, Property, Invoice } from "../../types";

interface ContractFormProps {
    tenants: Tenant[];
    units: Unit[];
    properties: Property[];
    onClose: () => void;
}

export default function ContractForm({ tenants, units, properties, onClose }: ContractFormProps) {
  const [formData, setFormData] = useState({
    tenant_id: "", unit_id: "", start_date: "", end_date: "", total_rent: 0, payment_frequency: "yearly",
  });
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      setUploading(true);
      try {
        let contractUrl = "";
        if (contractFile) { contractUrl = (await base44.integrations.Core.UploadFile({ file: contractFile })).file_url; }
        
        const contractData = { ...data, contract_url: contractUrl, status: 'active' };
        const contract = await base44.entities.Contract.create(contractData);

        await base44.entities.Unit.update(data.unit_id, { status: "occupied" });

        const startDate = new Date(`${data.start_date}T00:00:00Z`);
        const endDate = new Date(`${data.end_date}T00:00:00Z`);
        const frequency = data.payment_frequency;
        
        let monthsIncrement = 12;
        if (frequency === "3_months") monthsIncrement = 3;
        else if (frequency === "6_months") monthsIncrement = 6;
        else if (frequency === "monthly") monthsIncrement = 1;
        
        const newInvoices: Omit<Invoice, 'id' | 'created_at'>[] = [];
        let currentDate = new Date(startDate);
        
        while (currentDate < endDate) {
            newInvoices.push({ contract_id: contract.id, due_date: format(currentDate, "yyyy-MM-dd"), amount: 0, paid_amount: 0, status: "unpaid" });
            currentDate = addHijriMonths(currentDate, monthsIncrement);
        }

        if (newInvoices.length > 0) {
            const amountPerPayment = data.total_rent / newInvoices.length;
            newInvoices.forEach(inv => inv.amount = amountPerPayment);
            await base44.entities.Invoice.bulkCreate(newInvoices);
        }

        return contract;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts', 'units', 'invoices']);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(formData); };
  const availableUnits = units.filter(u => u.status === 'vacant');
  const getPropertyName = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '';
    const property = properties.find(p => p.id === unit.property_id);
    return property?.name || '';
  };

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="bg-slate-50 border-b"><div className="flex justify-between items-center"><CardTitle>Add Contract</CardTitle><Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button></div></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"><p className="text-sm text-blue-900"><strong>Note:</strong> Create the tenant first in the Tenants page, then return here to create the contract.</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="tenant_id">Tenant *</Label><Select value={formData.tenant_id} onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })} required><option value="" disabled>Select tenant</option>{tenants.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</Select></div>
            <div className="space-y-2"><Label htmlFor="unit_id">Available Unit *</Label><Select value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} required><option value="" disabled>Select unit</option>{availableUnits.map((u) => (<option key={u.id} value={u.id}>{getPropertyName(u.id)} - Unit {u.unit_number}</option>))}</Select></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="start_date">Contract Start Date *</Label><Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required/></div>
            <div className="space-y-2"><Label htmlFor="end_date">Contract End Date *</Label><Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required/></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="total_rent">Total Rent for Contract Period (SAR) *</Label><Input id="total_rent" type="number" min="0" step="0.01" value={formData.total_rent || ''} onChange={(e) => setFormData({ ...formData, total_rent: parseFloat(e.target.value) || 0 })} required placeholder="Total rent for entire period"/></div>
            <div className="space-y-2"><Label htmlFor="payment_frequency">Payment Frequency *</Label><Select value={formData.payment_frequency} onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}><option value="3_months">3 Months</option><option value="6_months">6 Months</option><option value="yearly">Yearly</option></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="contract_doc">Signed Contract</Label><Input id="contract_doc" type="file" accept="image/*,.pdf" onChange={(e) => setContractFile(e.target.files ? e.target.files[0] : null)} className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900"><strong>Automatic Invoice Generation:</strong> Rent invoices will be automatically created for the entire contract period based on your payment frequency.</div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || uploading}>
            {uploading || saveMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : (<><Save className="w-4 h-4 mr-2" />Create Contract</>)}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}