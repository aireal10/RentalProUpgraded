
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "../../hooks/useApi";
import { useSettings } from "../../context/SettingsContext";
import { base44 } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { X, Save, Loader2, Plus, Trash2, Settings, LayoutDashboard } from "../Icons";
import { Property, Unit, LeasePayment } from "../../types";
import { DatePickerWithHijri } from "../ui/DatePickerWithHijri";
import { format } from "../../utils/helpers";

type FormData = {
  name: string;
  property_type: 'Building' | 'Villa' | 'Warehouse' | 'Shop' | 'Office';
  address: string;
  total_investment: number;
  management_commission: number;
  is_leased: boolean;
  lease_start_date: string | null;
  lease_end_date: string | null;
  owner_rent_amount: number | null;
  owner_rent_frequency: '3_months' | '6_months' | 'yearly' | null;
  lease_invoice_url: string | null;
  electricity_meter: string;
  water_meter: string;
  gas_meter: string;
  internet_account: string;
  electricity_amount: number;
  water_amount: number;
  gas_amount: number;
  internet_amount: number;
  electricity_bill_paid: boolean;
  water_bill_paid: boolean;
  gas_bill_paid: boolean;
  internet_bill_paid: boolean;
};

// New Interface for the Smart Generator Groups
type UnitGenGroup = {
  id: string;
  count: number;
  unit_type: 'Flat' | 'Room';
  rooms: number;
  halls: number;
  kitchens: number;
  bathrooms: number;
  furnished: boolean;
  parking: boolean;
  rent_amount: number;
};

export default function PropertyForm({ property, units, onClose }: { property: Property | null, units: Unit[], onClose: () => void }) {
  const { t } = useSettings();
  const [formData, setFormData] = useState<Omit<FormData, 'lease_invoice_url'>>({
    name: property?.name || "",
    property_type: property?.property_type || "Building",
    address: property?.address || "",
    total_investment: property?.total_investment || 0,
    management_commission: property?.management_commission || 0,
    is_leased: property?.is_leased || false,
    lease_start_date: property?.lease_start_date ? property.lease_start_date.split('T')[0] : "",
    lease_end_date: property?.lease_end_date ? property.lease_end_date.split('T')[0] : "",
    owner_rent_amount: property?.owner_rent_amount || 0,
    owner_rent_frequency: property?.owner_rent_frequency || "6_months",
    electricity_meter: property?.electricity_meter || "",
    water_meter: property?.water_meter || "",
    gas_meter: property?.gas_meter || "",
    internet_account: property?.internet_account || "",
    electricity_amount: property?.electricity_amount || 0,
    water_amount: property?.water_amount || 0,
    gas_amount: property?.gas_amount || 0,
    internet_amount: property?.internet_amount || 0,
    electricity_bill_paid: property?.electricity_bill_paid || false,
    water_bill_paid: property?.water_bill_paid || false,
    gas_bill_paid: property?.gas_bill_paid || false,
    internet_bill_paid: property?.internet_bill_paid || false,
  });
  
  // Ensure form is populated correctly when editing (re-run if property changes)
  useEffect(() => {
    if (property) {
        setFormData({
            name: property.name || "",
            property_type: property.property_type || "Building",
            address: property.address || "",
            total_investment: property.total_investment || 0,
            management_commission: property.management_commission || 0,
            is_leased: property.is_leased || false,
            lease_start_date: property.lease_start_date ? property.lease_start_date.split('T')[0] : "",
            lease_end_date: property.lease_end_date ? property.lease_end_date.split('T')[0] : "",
            owner_rent_amount: property.owner_rent_amount || 0,
            owner_rent_frequency: property.owner_rent_frequency || "6_months",
            electricity_meter: property.electricity_meter || "",
            water_meter: property.water_meter || "",
            gas_meter: property.gas_meter || "",
            internet_account: property.internet_account || "",
            electricity_amount: property.electricity_amount || 0,
            water_amount: property.water_amount || 0,
            gas_amount: property.gas_amount || 0,
            internet_amount: property.internet_amount || 0,
            electricity_bill_paid: property.electricity_bill_paid || false,
            water_bill_paid: property.water_bill_paid || false,
            gas_bill_paid: property.gas_bill_paid || false,
            internet_bill_paid: property.internet_bill_paid || false,
        });
    }
  }, [property]);
  
  // Unit Generation Mode State
  const [unitGenMode, setUnitGenMode] = useState<'simple' | 'smart'>('simple');

  // Simple Generator State
  const [simpleGen, setSimpleGen] = useState({
    family_count: 0,
    bachelor_count: 0,
    start_number: 1,
  });

  // Calculate next available unit number when property units load or change
  useEffect(() => {
      if (property && units) {
        const propertyUnits = units.filter(u => u.property_id === property.id);
        const maxNum = propertyUnits.reduce((max, u) => {
            const num = parseInt(u.unit_number);
            return !isNaN(num) && num > max ? num : max;
        }, 0);
        setSimpleGen(prev => ({ ...prev, start_number: maxNum + 1 }));
      }
  }, [property, units]);

  // Smart Generator State
  const [familyGroups, setFamilyGroups] = useState<UnitGenGroup[]>([]);
  const [bachelorGroups, setBachelorGroups] = useState<UnitGenGroup[]>([]);

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();

  const addGroup = (type: 'Family' | 'Bachelor') => {
    const newGroup: UnitGenGroup = {
      id: crypto.randomUUID(),
      count: 1,
      unit_type: type === 'Family' ? 'Flat' : 'Room',
      rooms: 2,
      halls: 1,
      kitchens: 1,
      bathrooms: 1,
      furnished: false,
      parking: type === 'Family', // Default true for family
      rent_amount: 0,
    };
    
    if (type === 'Family') {
      setFamilyGroups([...familyGroups, newGroup]);
    } else {
      setBachelorGroups([...bachelorGroups, newGroup]);
    }
  };

  const removeGroup = (type: 'Family' | 'Bachelor', id: string) => {
    if (type === 'Family') {
      setFamilyGroups(familyGroups.filter(g => g.id !== id));
    } else {
      setBachelorGroups(bachelorGroups.filter(g => g.id !== id));
    }
  };

  const updateGroup = (type: 'Family' | 'Bachelor', id: string, field: keyof UnitGenGroup, value: any) => {
    const updater = (groups: UnitGenGroup[]) => groups.map(g => g.id === id ? { ...g, [field]: value } : g);
    if (type === 'Family') setFamilyGroups(updater(familyGroups));
    else setBachelorGroups(updater(bachelorGroups));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<FormData, 'lease_invoice_url'>) => {
      
      let cleanedData: Partial<FormData> = { ...data };

      if (!cleanedData.is_leased) {
        cleanedData.lease_start_date = null;
        cleanedData.lease_end_date = null;
        cleanedData.owner_rent_amount = null;
        cleanedData.owner_rent_frequency = null;
        cleanedData.lease_invoice_url = null;
      } else {
        if (!cleanedData.lease_start_date) cleanedData.lease_start_date = null;
        if (!cleanedData.lease_end_date) cleanedData.lease_end_date = null;
      }

      // --- FILE UPLOAD ---
      let lease_invoice_url = property?.lease_invoice_url || null;
      if(invoiceFile) {
        setIsUploading(true);
        try {
            lease_invoice_url = (await base44.integrations.Core.UploadFile({ file: invoiceFile })).file_url;
        } finally {
            setIsUploading(false);
        }
      }
      
      cleanedData.lease_invoice_url = lease_invoice_url;

      // --- SAVE PROPERTY ---
      let savedProperty;
      if (property) {
        savedProperty = await base44.entities.Property.update(property.id, cleanedData);
      } else {
        savedProperty = await base44.entities.Property.create(cleanedData);
      }

      // --- GENERATE / UPDATE LEASE PAYMENTS (IF LEASED) ---
      if (savedProperty.is_leased && savedProperty.lease_start_date && savedProperty.lease_end_date && savedProperty.owner_rent_amount && savedProperty.owner_rent_frequency) {
        
        // 1. Fetch existing payments for this property
        const existingPayments = await base44.entities.LeasePayment.list() as LeasePayment[];
        const propertyPayments = existingPayments.filter(p => p.property_id === savedProperty.id);
        
        // 2. Identify unpaid payments to remove (Regenerate logic)
        // We remove 'unpaid' ones so we can recreate them with new terms (date, amount).
        // We keep 'paid' or 'partial' to preserve history.
        const unpaidPaymentIds = propertyPayments
            .filter(p => p.status === 'unpaid')
            .map(p => p.id);
        
        if (unpaidPaymentIds.length > 0) {
             await base44.entities.LeasePayment.bulkDelete(unpaidPaymentIds);
        }

        // 3. Calculate the ideal schedule based on new terms
        const startDate = new Date(savedProperty.lease_start_date);
        // endDate calculation adjustment for inclusive/exclusive loop
        const endDateStr = savedProperty.lease_end_date;
        
        const annualRent = savedProperty.owner_rent_amount;
        const frequency = savedProperty.owner_rent_frequency;

        let monthsIncrement = 12;
        let paymentsPerYear = 1;

        if (frequency === '6_months') {
            monthsIncrement = 6;
            paymentsPerYear = 2;
        } else if (frequency === '3_months') {
            monthsIncrement = 3;
            paymentsPerYear = 4;
        }

        const amountPerPayment = annualRent / paymentsPerYear;
        const potentialPayments = [];
        let currentDate = new Date(startDate);

        // Generate full schedule from start to end
        while (format(currentDate, 'yyyy-MM-dd') < endDateStr) {
            potentialPayments.push({
                property_id: savedProperty.id,
                due_date: format(currentDate, 'yyyy-MM-dd'),
                amount: amountPerPayment,
                paid_amount: 0,
                status: 'unpaid'
            });
            // Add Gregorian months
            currentDate.setUTCMonth(currentDate.getUTCMonth() + monthsIncrement);
        }

        // 4. Filter: Only create payments if there isn't already a PAID/PARTIAL payment matching that date
        // This prevents duplication if the user is just editing a property name but kept the schedule.
        const remainingPayments = propertyPayments.filter(p => p.status !== 'unpaid');
        
        const paymentsToCreate = potentialPayments.filter(newP => {
             return !remainingPayments.some(existingP => existingP.due_date === newP.due_date);
        });

        if (paymentsToCreate.length > 0) {
            await base44.entities.LeasePayment.bulkCreate(paymentsToCreate);
        }
      } else if (!savedProperty.is_leased && property && property.is_leased) {
          // Case: Property was leased, now updated to NOT leased.
          // Remove all unpaid obligations.
           const existingPayments = await base44.entities.LeasePayment.list() as LeasePayment[];
           const unpaidIds = existingPayments
                .filter(p => p.property_id === savedProperty.id && p.status === 'unpaid')
                .map(p => p.id);
           if(unpaidIds.length > 0) {
               await base44.entities.LeasePayment.bulkDelete(unpaidIds);
           }
      }
      
      // --- UNIT CREATION ---
      let newUnits = [];
      
      const allUnits = await base44.entities.Unit.list() as Unit[];
      const existingUnits = allUnits.filter(u => u.property_id === savedProperty.id);
      const maxExistingNum = existingUnits.reduce((max, u) => {
          const num = parseInt(u.unit_number);
          return !isNaN(num) && num > max ? num : max;
        }, 0);


      if (unitGenMode === 'simple') {
          // SIMPLE MODE GENERATION
          // Set specs to 0 to indicate "Unspecified" / "Standard"
          let currentUnitNum = simpleGen.start_number > 1 ? simpleGen.start_number : maxExistingNum + 1;

          // Generate Family Units
          if (simpleGen.family_count > 0) {
              for (let i = 0; i < simpleGen.family_count; i++) {
                  newUnits.push({
                      property_id: savedProperty.id,
                      unit_number: currentUnitNum.toString(),
                      unit_type: 'Flat',
                      num_rooms: 0, 
                      num_halls: 0,
                      num_kitchens: 0,
                      num_bathrooms: 0,
                      occupancy_type: 'Family',
                      furnished: false,
                      has_parking: false,
                      rent_amount: 0,
                      status: "vacant",
                  });
                  currentUnitNum++;
              }
          }
          
          // Generate Bachelor Units
          if (simpleGen.bachelor_count > 0) {
              for (let i = 0; i < simpleGen.bachelor_count; i++) {
                  newUnits.push({
                      property_id: savedProperty.id,
                      unit_number: currentUnitNum.toString(),
                      unit_type: 'Flat',
                      num_rooms: 0,
                      num_halls: 0,
                      num_kitchens: 0,
                      num_bathrooms: 0,
                      occupancy_type: 'Bachelor',
                      furnished: false,
                      has_parking: false,
                      rent_amount: 0,
                      status: "vacant",
                  });
                  currentUnitNum++;
              }
          }

      } else {
          // SMART MODE GENERATION
          let currentUnitNum = maxExistingNum + 1;

          // Process Family Groups
          for (const group of familyGroups) {
            for (let i = 0; i < group.count; i++) {
              newUnits.push({
                property_id: savedProperty.id,
                unit_number: currentUnitNum.toString(),
                unit_type: group.unit_type,
                num_rooms: group.rooms,
                num_halls: group.halls,
                num_kitchens: group.kitchens,
                num_bathrooms: group.bathrooms,
                occupancy_type: 'Family',
                furnished: group.furnished,
                has_parking: group.parking,
                rent_amount: group.rent_amount || 0,
                status: "vacant",
              });
              currentUnitNum++;
            }
          }

          // Process Bachelor Groups
          for (const group of bachelorGroups) {
            for (let i = 0; i < group.count; i++) {
               newUnits.push({
                property_id: savedProperty.id,
                unit_number: currentUnitNum.toString(),
                unit_type: group.unit_type,
                num_rooms: group.rooms,
                num_halls: group.halls,
                num_kitchens: group.kitchens,
                num_bathrooms: group.bathrooms,
                occupancy_type: 'Bachelor',
                furnished: group.furnished,
                has_parking: group.parking,
                rent_amount: group.rent_amount || 0,
                status: "vacant",
              });
              currentUnitNum++;
            }
          }
      }

      if (newUnits.length > 0) {
        await base44.entities.Unit.bulkCreate(newUnits);
      }

      return savedProperty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['properties', 'units', 'lease-payments']);
      onClose();
    },
    onError: (err) => {
        alert("Failed to save property. Check console for details.");
        console.error(err);
        setIsUploading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Helper to render a group row
  const renderGroupRow = (group: UnitGenGroup, type: 'Family' | 'Bachelor') => (
    <div key={group.id} className="grid grid-cols-13 gap-2 items-end border-b border-slate-100 pb-2 mb-2 last:border-0 last:mb-0">
        <div className="col-span-2 space-y-1">
            <Label className="text-[9px] text-slate-400 uppercase">Qty</Label>
            <Input 
                type="number" 
                min="1" 
                value={group.count} 
                onChange={(e) => updateGroup(type, group.id, 'count', parseInt(e.target.value) || 0)} 
                className="h-7 text-xs px-1" 
                placeholder="Qty" 
            />
        </div>
         <div className="col-span-2 space-y-1">
            <Label className="text-[9px] text-slate-400 uppercase">{t('type')}</Label>
             <Select value={group.unit_type} onChange={(e) => updateGroup(type, group.id, 'unit_type', e.target.value as any)} className="h-7 text-xs px-1">
                <option value="Flat">Flat</option>
                <option value="Room">Room</option>
            </Select>
        </div>
         <div className="col-span-2 space-y-1">
            <Label className="text-[9px] text-slate-400 uppercase">Rent (SAR)</Label>
            <Input type="number" min="0" value={group.rent_amount} onChange={(e) => updateGroup(type, group.id, 'rent_amount', parseFloat(e.target.value) || 0)} className="h-7 text-xs px-1" placeholder="0" />
        </div>
        <div className="col-span-4 grid grid-cols-4 gap-1">
            <div className="space-y-1">
                 <Label className="text-[9px] text-slate-400 uppercase">Bed</Label>
                 <Select value={group.rooms} onChange={(e) => updateGroup(type, group.id, 'rooms', parseInt(e.target.value))} className="h-7 text-xs px-1">
                    {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                 </Select>
            </div>
             <div className="space-y-1">
                 <Label className="text-[9px] text-slate-400 uppercase">Hall</Label>
                 <Select value={group.halls} onChange={(e) => updateGroup(type, group.id, 'halls', parseInt(e.target.value))} className="h-7 text-xs px-1">
                    {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                 </Select>
            </div>
             <div className="space-y-1">
                 <Label className="text-[9px] text-slate-400 uppercase">Bath</Label>
                 <Select value={group.bathrooms} onChange={(e) => updateGroup(type, group.id, 'bathrooms', parseInt(e.target.value))} className="h-7 text-xs px-1">
                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                 </Select>
            </div>
             <div className="space-y-1">
                 <Label className="text-[9px] text-slate-400 uppercase">Kit</Label>
                 <Select value={group.kitchens} onChange={(e) => updateGroup(type, group.id, 'kitchens', parseInt(e.target.value))} className="h-7 text-xs px-1">
                    {[0,1].map(n => <option key={n} value={n}>{n}</option>)}
                 </Select>
            </div>
        </div>
        <div className="col-span-2 flex items-center justify-around gap-2 pb-1.5">
            <div className="flex items-center space-x-1">
                <Checkbox id={`park_${group.id}`} checked={group.parking} onCheckedChange={(c) => updateGroup(type, group.id, 'parking', !!c)} />
                <Label htmlFor={`park_${group.id}`} className="cursor-pointer text-[10px]">Park</Label>
            </div>
             <div className="flex items-center space-x-1">
                <Checkbox id={`furn_${group.id}`} checked={group.furnished} onCheckedChange={(c) => updateGroup(type, group.id, 'furnished', !!c)} />
                <Label htmlFor={`furn_${group.id}`} className="cursor-pointer text-[10px]">Furn</Label>
            </div>
        </div>
        <div className="col-span-1 flex justify-end pb-1">
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeGroup(type, group.id)}>
                <Trash2 className="w-3 h-3" />
            </Button>
        </div>
    </div>
  );

  return (
    <Card className="shadow-xl border-none w-full max-w-5xl mx-auto my-2 flex flex-col h-auto max-h-[90vh]">
      <CardHeader className="bg-slate-50 border-b py-2 px-4 flex-shrink-0">
        <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold text-slate-800">{property ? t('edit') : t('addProperty')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      
      <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
        <CardContent className="p-4 space-y-4 overflow-y-auto">
            
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="md:col-span-2 space-y-1">
                <Label htmlFor="name" className="text-[10px] font-bold text-slate-500 uppercase">{t('name')} *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('propertyName')} required className="h-8 text-sm"/>
             </div>
             <div className="md:col-span-2 space-y-1">
                <Label htmlFor="address" className="text-[10px] font-bold text-slate-500 uppercase">{t('address')} *</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Location" required className="h-8 text-sm"/>
             </div>
             <div className="space-y-1">
                <Label htmlFor="property_type" className="text-[10px] font-bold text-slate-500 uppercase">{t('type')} *</Label>
                <Select value={formData.property_type} onChange={(e) => setFormData({ ...formData, property_type: e.target.value as any })} className="h-8 text-xs">
                    <option value="Building">Building</option>
                    <option value="Villa">Villa</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Shop">Shop</option>
                    <option value="Office">Office</option>
                </Select>
             </div>
          </div>

          {/* Section 2: Financials & Utilities */}
           <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                   <div className="space-y-1">
                        <Label htmlFor="total_investment" className="text-[10px] font-bold text-slate-500 uppercase">{t('investment')} (SAR)</Label>
                        <Input id="total_investment" type="number" min="0" value={formData.total_investment || ''} onChange={(e) => setFormData({ ...formData, total_investment: parseFloat(e.target.value) || 0 })} className="h-8 text-sm bg-white"/>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="management_commission" className="text-[10px] font-bold text-slate-500 uppercase">{t('commission')} (SAR)</Label>
                        <Input id="management_commission" type="number" min="0" value={formData.management_commission || ''} onChange={(e) => setFormData({ ...formData, management_commission: parseFloat(e.target.value) || 0 })} className="h-8 text-sm bg-white" placeholder="e.g. 5000"/>
                    </div>
                    <div className="flex items-center space-x-2 pb-1.5 md:col-span-2">
                         <Switch id="is_leased" checked={formData.is_leased} onCheckedChange={(checked) => setFormData({ ...formData, is_leased: checked })} className="scale-75"/>
                        <Label htmlFor="is_leased" className="cursor-pointer font-semibold text-sm text-slate-700">Is Leased Property?</Label>
                    </div>
               </div>

                {/* Utility Account Numbers (Building Level) */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="electricity_meter" className="text-[9px] font-bold text-slate-500 uppercase">Elec Meter #</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="p_elec_paid" checked={formData.electricity_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, electricity_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="p_elec_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input id="electricity_meter" value={formData.electricity_meter} onChange={(e) => setFormData({ ...formData, electricity_meter: e.target.value })} className="h-8 text-xs bg-white" placeholder="Building/Master"/>
                        <Input type="number" value={formData.electricity_amount || ''} onChange={(e) => setFormData({ ...formData, electricity_amount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs bg-white" placeholder="Amount (SAR)"/>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="water_meter" className="text-[9px] font-bold text-slate-500 uppercase">Water Acct #</Label>
                            <div className="flex items-center space-x-1">
                                <Checkbox id="p_water_paid" checked={formData.water_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, water_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="p_water_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input id="water_meter" value={formData.water_meter} onChange={(e) => setFormData({ ...formData, water_meter: e.target.value })} className="h-8 text-xs bg-white" placeholder="Building/Master"/>
                        <Input type="number" value={formData.water_amount || ''} onChange={(e) => setFormData({ ...formData, water_amount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs bg-white" placeholder="Amount (SAR)"/>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                             <Label htmlFor="gas_meter" className="text-[9px] font-bold text-slate-500 uppercase">Gas Acct #</Label>
                             <div className="flex items-center space-x-1">
                                <Checkbox id="p_gas_paid" checked={formData.gas_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, gas_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="p_gas_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input id="gas_meter" value={formData.gas_meter} onChange={(e) => setFormData({ ...formData, gas_meter: e.target.value })} className="h-8 text-xs bg-white" placeholder="Building/Master"/>
                        <Input type="number" value={formData.gas_amount || ''} onChange={(e) => setFormData({ ...formData, gas_amount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs bg-white" placeholder="Amount (SAR)"/>
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center">
                             <Label htmlFor="internet_account" className="text-[9px] font-bold text-slate-500 uppercase">Internet Acct #</Label>
                             <div className="flex items-center space-x-1">
                                <Checkbox id="p_net_paid" checked={formData.internet_bill_paid} onCheckedChange={(c) => setFormData({ ...formData, internet_bill_paid: !!c })} className="h-3 w-3" />
                                <Label htmlFor="p_net_paid" className="text-[9px] cursor-pointer text-green-700">Paid</Label>
                            </div>
                        </div>
                        <Input id="internet_account" value={formData.internet_account} onChange={(e) => setFormData({ ...formData, internet_account: e.target.value })} className="h-8 text-xs bg-white" placeholder="Building/Master"/>
                        <Input type="number" value={formData.internet_amount || ''} onChange={(e) => setFormData({ ...formData, internet_amount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs bg-white" placeholder="Amount (SAR)"/>
                    </div>
               </div>
               
               {formData.is_leased && (
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 bg-blue-50/50 p-2 rounded">
                     <div className="space-y-1">
                         <Label className="text-[10px] font-bold text-slate-500 uppercase">{t('ownerRent')} (SAR)</Label>
                         <Input type="number" min="0" value={formData.owner_rent_amount || ''} onChange={(e) => setFormData({ ...formData, owner_rent_amount: parseFloat(e.target.value) || 0 })} required={formData.is_leased} className="h-8 text-sm bg-white"/>
                     </div>
                     <div className="space-y-1">
                         <Label className="text-[10px] font-bold text-slate-500 uppercase">{t('paymentFreq')}</Label>
                         <Select value={formData.owner_rent_frequency || ''} onChange={(e) => setFormData({ ...formData, owner_rent_frequency: e.target.value as any })} className="h-8 text-xs bg-white">
                             <option value="3_months">Quarterly</option>
                             <option value="6_months">Semi-Annually</option>
                             <option value="yearly">Yearly</option>
                         </Select>
                     </div>
                     <div className="transform scale-95 origin-top-left"><DatePickerWithHijri label={t('leaseStart')} id="lease_start_date" value={formData.lease_start_date || ''} onChange={(e) => setFormData({ ...formData, lease_start_date: e.target.value })} required={formData.is_leased} /></div>
                     <div className="transform scale-95 origin-top-left"><DatePickerWithHijri label={t('leaseEnd')} id="lease_end_date" value={formData.lease_end_date || ''} onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })} required={formData.is_leased} /></div>
                     <div className="col-span-4 space-y-1 border-t border-slate-200 pt-2 mt-1">
                         <Label className="text-[10px] font-bold text-slate-500 uppercase">Lease Contract/Invoice</Label>
                         <Input type="file" onChange={(e) => setInvoiceFile(e.target.files ? e.target.files[0] : null)} className="h-8 text-xs bg-white w-full max-w-sm" />
                     </div>
                 </div>
               )}
           </div>

          {/* Section 3: Unit Generator (Simple / Smart) */}
          <div className="border-t pt-3">
             <div className="flex items-center justify-between mb-4">
                 <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide bg-blue-50 p-2 rounded inline-block">Unit Generator</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Choose "Simple" for basic bulk add, or "Smart" for complex groupings.</p>
                 </div>
                 <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <button type="button" onClick={() => setUnitGenMode('simple')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${unitGenMode === 'simple' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Simple</button>
                    <button type="button" onClick={() => setUnitGenMode('smart')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${unitGenMode === 'smart' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Smart</button>
                 </div>
             </div>

            {unitGenMode === 'simple' ? (
                 <div className="bg-white border rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Number of Family Flats</Label>
                            <Input type="number" min="0" value={simpleGen.family_count} onChange={(e) => setSimpleGen({...simpleGen, family_count: parseInt(e.target.value)||0})} className="h-8 text-sm" placeholder="e.g. 10"/>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Number of Bachelor Flats</Label>
                            <Input type="number" min="0" value={simpleGen.bachelor_count} onChange={(e) => setSimpleGen({...simpleGen, bachelor_count: parseInt(e.target.value)||0})} className="h-8 text-sm" placeholder="e.g. 5"/>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Start Unit #</Label>
                            <Input type="number" min="1" value={simpleGen.start_number} onChange={(e) => setSimpleGen({...simpleGen, start_number: parseInt(e.target.value)||1})} className="h-8 text-sm" placeholder="e.g. 101"/>
                         </div>
                    </div>
                 </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Family Section */}
                    <div className="border rounded-lg bg-white overflow-hidden">
                        <div className="bg-blue-50 p-2 border-b flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-700 uppercase">Family Units</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => addGroup('Family')} className="h-6 text-xs bg-white hover:bg-blue-100 border-blue-200 text-blue-700">
                                <Plus className="w-3 h-3 mr-1"/> Add Group
                            </Button>
                        </div>
                        <div className="p-2 min-h-[100px] bg-slate-50/50">
                            {familyGroups.length === 0 && <p className="text-xs text-slate-400 text-center py-8 italic">No family units added.</p>}
                            {familyGroups.map(group => renderGroupRow(group, 'Family'))}
                        </div>
                        {familyGroups.length > 0 && (
                            <div className="bg-slate-100 p-2 text-right text-xs font-medium text-slate-600 border-t">
                                Total Family Units: {familyGroups.reduce((acc, g) => acc + g.count, 0)}
                            </div>
                        )}
                    </div>

                    {/* Bachelor Section */}
                    <div className="border rounded-lg bg-white overflow-hidden">
                        <div className="bg-orange-50 p-2 border-b flex justify-between items-center">
                            <span className="text-xs font-bold text-orange-700 uppercase">Bachelor Units</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => addGroup('Bachelor')} className="h-6 text-xs bg-white hover:bg-orange-100 border-orange-200 text-orange-700">
                                <Plus className="w-3 h-3 mr-1"/> Add Group
                            </Button>
                        </div>
                        <div className="p-2 min-h-[100px] bg-slate-50/50">
                            {bachelorGroups.length === 0 && <p className="text-xs text-slate-400 text-center py-8 italic">No bachelor units added.</p>}
                            {bachelorGroups.map(group => renderGroupRow(group, 'Bachelor'))}
                        </div>
                        {bachelorGroups.length > 0 && (
                            <div className="bg-slate-100 p-2 text-right text-xs font-medium text-slate-600 border-t">
                                Total Bachelor Units: {bachelorGroups.reduce((acc, g) => acc + g.count, 0)}
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-2 px-4 flex justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8">{t('cancel')}</Button>
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" disabled={saveMutation.isPending || isUploading}>
            {saveMutation.isPending || isUploading ? (<><Loader2 className="w-3 h-3 mr-2 animate-spin" />{t('saving')}</>) : (<><Save className="w-3 h-3 mr-2" />{t('save')}</>)}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
