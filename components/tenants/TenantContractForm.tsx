
import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { X, Save, Loader2, Users, FileText, CreditCard } from "../Icons";
import { Tenant, Contract, Property, Unit, Invoice } from "../../types";
import { format } from "../../utils/helpers";
import { DatePickerWithHijri } from "../ui/DatePickerWithHijri";

interface TenantContractFormProps {
  tenantToEdit: Tenant | null;
  contracts: Contract[];
  properties: Property[];
  units: Unit[];
  onClose: () => void;
}

export default function TenantContractForm({ tenantToEdit, contracts, properties, units, onClose }: TenantContractFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    iqama_number: "",
    iqama_expiry: "",
    nationality: "",
    phone: "",
    tenant_type: "Family",
    property_id: "",
    unit_id: "",
    start_date: "",
    end_date: "",
    total_rent: 0,
    payment_frequency: "yearly",
    security_deposit: 0,
    advance_payment: 0,
    condition_at_move_in: "",
    // Utility Fields
    electricity_meter: "",
    water_meter: "",
    gas_meter: "",
    internet_account: "",
    electricity_amount: 0,
    water_amount: 0,
    gas_amount: 0,
    internet_amount: 0,
    electricity_bill_paid: false,
    water_bill_paid: false,
    gas_bill_paid: false,
    internet_bill_paid: false,
  });
  const [idCopyFile, setIdCopyFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    if (tenantToEdit) {
      const contract = contracts.find(c => c.tenant_id === tenantToEdit.id);
      const unit = contract ? units.find(u => u.id === contract.unit_id) : null;
      const property = unit ? properties.find(p => p.id === unit.property_id) : null;

      setFormData({
        name: tenantToEdit.name || "",
        iqama_number: tenantToEdit.iqama_number || "",
        iqama_expiry: tenantToEdit.iqama_expiry ? tenantToEdit.iqama_expiry.split('T')[0] : "",
        nationality: tenantToEdit.nationality || "",
        phone: tenantToEdit.phone || "",
        tenant_type: tenantToEdit.tenant_type || "Family",
        property_id: property?.id || "",
        unit_id: unit?.id || "",
        start_date: contract?.start_date ? contract.start_date.split('T')[0] : "",
        end_date: contract?.end_date ? contract.end_date.split('T')[0] : "",
        total_rent: contract?.total_rent || 0,
        payment_frequency: contract?.payment_frequency || "yearly",
        security_deposit: contract?.security_deposit || 0,
        advance_payment: contract?.advance_payment || 0,
        condition_at_move_in: contract?.condition_at_move_in || "",
        electricity_meter: unit?.electricity_meter || "",
        water_meter: unit?.water_meter || "",
        gas_meter: unit?.gas_meter || "",
        internet_account: unit?.internet_account || "",
        electricity_amount: unit?.electricity_amount || 0,
        water_amount: unit?.water_amount || 0,
        gas_amount: unit?.gas_amount || 0,
        internet_amount: unit?.internet_amount || 0,
        electricity_bill_paid: unit?.electricity_bill_paid || false,
        water_bill_paid: unit?.water_bill_paid || false,
        gas_bill_paid: unit?.gas_bill_paid || false,
        internet_bill_paid: unit?.internet_bill_paid || false,
      });
    }
  }, [tenantToEdit, contracts, units, properties]);

  // Filter Logic: Match Property + Vacancy Status + Occupancy Type
  const filteredUnits = useMemo(() => {
    if (!formData.property_id) return [];
    
    return units.filter(u => {
        // 1. Must belong to selected property
        const isPropertyMatch = u.property_id === formData.property_id;
        
        // 2. Must be vacant OR be the unit currently assigned to this tenant (for edits)
        const isAvailabilityMatch = u.status === 'vacant' || u.id === formData.unit_id;
        
        // 3. CRITICAL: Unit Type must match Tenant Type (Family vs Bachelor)
        const isTypeMatch = u.occupancy_type ? u.occupancy_type === formData.tenant_type : true;

        return isPropertyMatch && isAvailabilityMatch && isTypeMatch;
    });
  }, [units, formData.property_id, formData.unit_id, formData.tenant_type]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
        setIsUploading(true);
        setDateError(null);

        // 1. Validate Dates against Property Lease
        const property = properties.find(p => p.id === data.property_id);
        if (property && property.is_leased && property.lease_start_date && property.lease_end_date) {
            const tenantStart = new Date(data.start_date);
            const tenantEnd = new Date(data.end_date);
            const propStart = new Date(property.lease_start_date);
            const propEnd = new Date(property.lease_end_date);

            if (tenantStart < propStart || tenantEnd > propEnd) {
                const errorMsg = `Contract dates must be within the property lease period (${property.lease_start_date} to ${property.lease_end_date}).`;
                setDateError(errorMsg);
                throw new Error(errorMsg);
            }
        }

        let id_copy_url = tenantToEdit?.id_copy_url;
        if(idCopyFile) {
            id_copy_url = (await base44.integrations.Core.UploadFile({ file: idCopyFile })).file_url;
        }

        const tenantData = {
            name: data.name,
            iqama_number: data.iqama_number,
            iqama_expiry: data.iqama_expiry || null,
            nationality: data.nationality,
            phone: data.phone,
            tenant_type: data.tenant_type as 'Family' | 'Bachelor',
            id_copy_url,
        };

        let tenant: Tenant;
        if (tenantToEdit) {
            tenant = await base44.entities.Tenant.update(tenantToEdit.id, tenantData);
        } else {
            tenant = await base44.entities.Tenant.create(tenantData);
        }

        const contractData = {
            tenant_id: tenant.id,
            unit_id: data.unit_id,
            start_date: data.start_date,
            end_date: data.end_date,
            total_rent: data.total_rent,
            payment_frequency: data.payment_frequency as any,
            security_deposit: data.security_deposit,
            advance_payment: data.advance_payment,
            condition_at_move_in: data.condition_at_move_in,
            status: 'active' as 'active',
        };
        
        const existingContract = tenantToEdit ? contracts.find(c => c.tenant_id === tenantToEdit.id) : null;
        let newOrUpdatedContract: Contract;

        if (existingContract) {
            const oldInvoices = (await base44.entities.Invoice.list() as Invoice[]).filter(i => i.contract_id === existingContract.id);
            await base44.entities.Invoice.bulkDelete(oldInvoices.map(i => i.id));
            newOrUpdatedContract = await base44.entities.Contract.update(existingContract.id, contractData);
            if (existingContract.unit_id !== data.unit_id) {
                await base44.entities.Unit.update(existingContract.unit_id, { status: "vacant" });
            }
        } else {
            newOrUpdatedContract = await base44.entities.Contract.create(contractData);
        }

        // Update Unit Utility Details (and status)
        await base44.entities.Unit.update(data.unit_id, { 
            status: "occupied",
            electricity_meter: data.electricity_meter,
            water_meter: data.water_meter,
            gas_meter: data.gas_meter,
            internet_account: data.internet_account,
            electricity_amount: data.electricity_amount,
            water_amount: data.water_amount,
            gas_amount: data.gas_amount,
            internet_amount: data.internet_amount,
            electricity_bill_paid: data.electricity_bill_paid,
            water_bill_paid: data.water_bill_paid,
            gas_bill_paid: data.gas_bill_paid,
            internet_bill_paid: data.internet_bill_paid,
        });

        // Invoice Generation Logic
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
            newInvoices.push({ contract_id: newOrUpdatedContract.id, due_date: format(currentDate, "yyyy-MM-dd"), amount: 0, paid_amount: 0, status: "unpaid" });
            const nextDate = new Date(currentDate);
            nextDate.setUTCMonth(nextDate.getUTCMonth() + monthsIncrement);
            currentDate = nextDate;
        }
        
        if (newInvoices.length > 0) {
            const amountPerPayment = data.total_rent / newInvoices.length;
            newInvoices.forEach(inv => inv.amount = amountPerPayment);

            const createdInvoices = await base44.entities.Invoice.bulkCreate(newInvoices);
            
            if (data.advance_payment > 0 && createdInvoices.length > 0) {
                const firstInvoice = createdInvoices[0];
                const paymentForFirst = Math.min(data.advance_payment, firstInvoice.amount);
                await base44.entities.Invoice.update(firstInvoice.id, {
                    paid_amount: paymentForFirst,
                    status: paymentForFirst >= firstInvoice.amount ? 'paid' : 'partial',
                });
            }
        }
        
        setIsUploading(false);
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['tenants', 'contracts', 'units', 'invoices']);
        onClose();
    },
    onError: (err: any) => {
        console.error("Failed to save tenant/contract", err);
        if (!dateError) alert(err.message || "Failed to save. Please check console for errors.");
        setIsUploading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(formData); };
  
  return (
    <Card className="shadow-xl border-none w-full max-w-5xl mx-auto my-2 flex flex-col h-auto max-h-[90vh]">
      <CardHeader className="bg-slate-50 border-b py-2 px-4 flex-shrink-0">
        <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold text-slate-800">{tenantToEdit ? 'Edit Tenant & Contract' : 'Add Tenant & Contract'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      
      <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
        <CardContent className="p-4 space-y-6 overflow-y-auto">
            
            {/* Section 1: Personal Information */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-md"><Users className="w-4 h-4 text-blue-600"/></div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tenant Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-1">
                        <Label htmlFor="name" className="text-[10px] font-bold text-slate-500 uppercase">Full Name *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Tenant Name" required className="h-8 text-sm"/>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="tenant_type" className="text-[10px] font-bold text-slate-500 uppercase">Type *</Label>
                        <Select 
                            value={formData.tenant_type} 
                            onChange={(e) => setFormData({ ...formData, tenant_type: e.target.value, unit_id: "" })} // Clear unit if type changes
                            className="h-8 text-xs"
                        >
                            <option value="Family">Family</option>
                            <option value="Bachelor">Bachelor</option>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[10px] font-bold text-slate-500 uppercase">Mobile *</Label>
                        <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+]/g, '') })} required className="h-8 text-sm"/>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="iqama_number" className="text-[10px] font-bold text-slate-500 uppercase">Iqama / ID *</Label>
                        <Input id="iqama_number" value={formData.iqama_number} onChange={(e) => setFormData({ ...formData, iqama_number: e.target.value.replace(/[^0-9]/g, '') })} required className="h-8 text-sm"/>
                    </div>
                    <div className="space-y-1 transform scale-95 origin-top-left w-[105%]">
                         <DatePickerWithHijri label="ID Expiry" id="iqama_expiry" value={formData.iqama_expiry} onChange={(e) => setFormData({ ...formData, iqama_expiry: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="nationality" className="text-[10px] font-bold text-slate-500 uppercase">Nationality</Label>
                        <Input id="nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="h-8 text-sm"/>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 my-2"></div>

            {/* Section 2: Contract Details */}
            <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 rounded-md"><FileText className="w-4 h-4 text-purple-600"/></div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contract & Unit</h3>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    {dateError && (
                        <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
                            {dateError}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 space-y-1">
                             <Label htmlFor="property_id" className="text-[10px] font-bold text-slate-500 uppercase">Property *</Label>
                             <Select 
                                value={formData.property_id} 
                                onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit_id: "" })} 
                                required 
                                className="h-8 text-xs bg-white"
                            >
                                <option value="" disabled>Select a Property</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                             <Label htmlFor="unit_id" className="text-[10px] font-bold text-slate-500 uppercase">Unit *</Label>
                             <Select 
                                value={formData.unit_id} 
                                onChange={(e) => {
                                    const selectedUnitId = e.target.value;
                                    const selectedUnit = units.find(u => u.id === selectedUnitId);
                                    setFormData({ 
                                        ...formData, 
                                        unit_id: selectedUnitId,
                                        total_rent: selectedUnit?.rent_amount || 0,
                                        electricity_meter: selectedUnit?.electricity_meter || "",
                                        water_meter: selectedUnit?.water_meter || "",
                                        gas_meter: selectedUnit?.gas_meter || "",
                                        internet_account: selectedUnit?.internet_account || "",
                                        electricity_amount: selectedUnit?.electricity_amount || 0,
                                        water_amount: selectedUnit?.water_amount || 0,
                                        gas_amount: selectedUnit?.gas_amount || 0,
                                        internet_amount: selectedUnit?.internet_amount || 0,
                                        electricity_bill_paid: selectedUnit?.electricity_bill_paid || false,
                                        water_bill_paid: selectedUnit?.water_bill_paid || false,
                                        gas_bill_paid: selectedUnit?.gas_bill_paid || false,
                                        internet_bill_paid: selectedUnit?.internet_bill_paid || false,
                                    });
                                }}
                                required 
                                disabled={!formData.property_id}
                                className="h-8 text-xs bg-white"
                             >
                                <option value="" disabled>
                                    {!formData.property_id ? "Select Property First" : filteredUnits.length === 0 ? `No Vacant ${formData.tenant_type} Units` : "Select a Unit"}
                                </option>
                                {filteredUnits.map(u => (
                                    <option key={u.id} value={u.id}>
                                        Unit {u.unit_number} ({u.num_rooms} Rooms) - SAR {u.rent_amount}
                                    </option>
                                ))}
                            </Select>
                        </div>
                         <div className="transform scale-95 origin-top-left w-[105%]">
                            <DatePickerWithHijri label="Start Date *" id="start_date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required/>
                        </div>
                         <div className="transform scale-95 origin-top-left w-[105%]">
                            <DatePickerWithHijri label="End Date *" id="end_date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required/>
                        </div>
                        <div className="md:col-span-4 space-y-1">
                            <Label htmlFor="condition_at_move_in" className="text-[10px] font-bold text-slate-500 uppercase">Condition at Occupancy</Label>
                            <Textarea 
                                id="condition_at_move_in" 
                                value={formData.condition_at_move_in} 
                                onChange={(e) => setFormData({ ...formData, condition_at_move_in: e.target.value })} 
                                placeholder="Describe unit condition (paint, fixtures, etc.)"
                                className="h-16 text-xs bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Utility Accounts (Unit Level) */}
                {formData.unit_id && (
                     <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mt-2">
                        <Label className="text-xs font-bold text-yellow-800 uppercase mb-2 block">Utility Accounts / Bills Cleared Check</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="u_electricity" className="text-[9px] text-slate-500 uppercase">Elec Meter #</Label>
                                    <div className="flex items-center space-x-1">
                                        <Checkbox id="u_elec_paid" checked={formData.electricity_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, electricity_bill_paid: !!c })} className="h-3 w-3" />
                                        <Label htmlFor="u_elec_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                                    </div>
                                </div>
                                <Input id="u_electricity" value={formData.electricity_meter} onChange={(e) => setFormData({ ...formData, electricity_meter: e.target.value })} className="h-7 text-xs bg-white" placeholder="Meter No."/>
                                <Input type="number" value={formData.electricity_amount || ''} onChange={(e) => setFormData({ ...formData, electricity_amount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs bg-white" placeholder="Amount"/>
                            </div>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="u_water" className="text-[9px] text-slate-500 uppercase">Water Acct #</Label>
                                    <div className="flex items-center space-x-1">
                                        <Checkbox id="u_water_paid" checked={formData.water_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, water_bill_paid: !!c })} className="h-3 w-3" />
                                        <Label htmlFor="u_water_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                                    </div>
                                </div>
                                <Input id="u_water" value={formData.water_meter} onChange={(e) => setFormData({ ...formData, water_meter: e.target.value })} className="h-7 text-xs bg-white" placeholder="Acct No."/>
                                <Input type="number" value={formData.water_amount || ''} onChange={(e) => setFormData({ ...formData, water_amount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs bg-white" placeholder="Amount"/>
                            </div>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="u_gas" className="text-[9px] text-slate-500 uppercase">Gas Acct #</Label>
                                    <div className="flex items-center space-x-1">
                                        <Checkbox id="u_gas_paid" checked={formData.gas_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, gas_bill_paid: !!c })} className="h-3 w-3" />
                                        <Label htmlFor="u_gas_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                                    </div>
                                </div>
                                <Input id="u_gas" value={formData.gas_meter} onChange={(e) => setFormData({ ...formData, gas_meter: e.target.value })} className="h-7 text-xs bg-white" placeholder="Acct No."/>
                                <Input type="number" value={formData.gas_amount || ''} onChange={(e) => setFormData({ ...formData, gas_amount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs bg-white" placeholder="Amount"/>
                            </div>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="u_internet" className="text-[9px] text-slate-500 uppercase">Internet Acct #</Label>
                                    <div className="flex items-center space-x-1">
                                        <Checkbox id="u_net_paid" checked={formData.internet_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, internet_bill_paid: !!c })} className="h-3 w-3" />
                                        <Label htmlFor="u_net_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                                    </div>
                                </div>
                                <Input id="u_internet" value={formData.internet_account} onChange={(e) => setFormData({ ...formData, internet_account: e.target.value })} className="h-7 text-xs bg-white" placeholder="Acct No."/>
                                <Input type="number" value={formData.internet_amount || ''} onChange={(e) => setFormData({ ...formData, internet_amount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs bg-white" placeholder="Amount"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>

             <div className="border-t border-slate-200 my-2"></div>

            {/* Section 3: Financials */}
             <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 rounded-md"><CreditCard className="w-4 h-4 text-green-600"/></div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Financial Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="space-y-1">
                        <Label htmlFor="total_rent" className="text-[10px] font-bold text-slate-500 uppercase">Total Rent (SAR) *</Label>
                        <Input id="total_rent" type="number" min="0" step="0.01" value={formData.total_rent || ''} onChange={(e) => setFormData({ ...formData, total_rent: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} required className="h-8 text-sm font-semibold text-slate-700"/>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="payment_frequency" className="text-[10px] font-bold text-slate-500 uppercase">Frequency *</Label>
                        <Select value={formData.payment_frequency} onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })} className="h-8 text-xs">
                            <option value="yearly">Yearly</option>
                            <option value="6_months">6 Months</option>
                            <option value="3_months">3 Months</option>
                            <option value="monthly">Monthly</option>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="security_deposit" className="text-[10px] font-bold text-slate-500 uppercase">Security Deposit</Label>
                        <Input id="security_deposit" type="number" min="0" step="0.01" value={formData.security_deposit || ''} onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="0.00" className="h-8 text-sm"/>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="advance_payment" className="text-[10px] font-bold text-slate-500 uppercase">Advance Pay</Label>
                        <Input id="advance_payment" type="number" min="0" step="0.01" value={formData.advance_payment || ''} onChange={(e) => setFormData({ ...formData, advance_payment: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="0.00" className="h-8 text-sm"/>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                         <Label htmlFor="id_copy" className="text-[10px] font-bold text-slate-500 uppercase">ID Copy / Document</Label>
                         <div className="flex items-center gap-2">
                            <Input id="id_copy" type="file" accept="image/*,.pdf" onChange={(e) => setIdCopyFile(e.target.files ? e.target.files[0] : null)} className="h-8 text-xs"/>
                            {tenantToEdit?.id_copy_url && !idCopyFile && <span className="text-[10px] text-green-600 font-medium">File Exists</span>}
                         </div>
                    </div>
                </div>
            </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-2 px-4 flex justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8">Cancel</Button>
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" disabled={saveMutation.isPending || isUploading}>
            {saveMutation.isPending || isUploading ? (<><Loader2 className="w-3 h-3 mr-2 animate-spin" />Saving...</>) : (<><Save className="w-3 h-3 mr-2" />Save Tenant</>)}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
