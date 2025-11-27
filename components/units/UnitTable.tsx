
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Pencil, Trash2 } from "../Icons";
import { Skeleton } from "../ui/skeleton";
import { Unit, Property, Contract, Tenant } from "../../types";
import { useSettings } from "../../context/SettingsContext";

interface UnitTableProps {
  units: Unit[];
  properties: Property[];
  contracts: Contract[];
  tenants: Tenant[];
  isLoading: boolean;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function UnitTable({ units, properties, contracts, tenants, isLoading, onEdit, onDelete, selectedIds, setSelectedIds }: UnitTableProps) {
  const { t } = useSettings();

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown';
  };

  const getTenantName = (unitId: string) => {
    const contract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
    if (!contract) return '-';
    const tenant = tenants.find(t => t.id === contract.tenant_id);
    return tenant?.name || 'Unknown Tenant';
  };

  // Helper to get the rent amount to display
  // If unit is occupied, show the Contract Rent. If vacant, show the Unit (Market) Rent.
  const getDisplayRent = (unit: Unit) => {
    const contract = contracts.find(c => c.unit_id === unit.id && c.status === 'active');
    return contract ? contract.total_rent : unit.rent_amount;
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? units.map(u => u.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(uId => uId !== id));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">No units found</p>
        <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[50px]">
                <Checkbox 
                    checked={selectedIds.length === units.length && units.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all units"
                />
            </TableHead>
            <TableHead>{t('properties')}</TableHead>
            <TableHead>{t('unitNum')}</TableHead>
            <TableHead>Specs</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('tenants')}</TableHead>
            <TableHead>{t('rentAmount')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit) => {
            const hasSpecs = unit.num_rooms > 0 || unit.num_halls > 0 || unit.num_kitchens > 0 || unit.num_bathrooms > 0;
            const displayRent = getDisplayRent(unit);
            const isOccupied = unit.status === 'occupied';

            return (
              <TableRow key={unit.id} className="hover:bg-slate-50">
                <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(unit.id)}
                      onCheckedChange={(checked) => handleSelectOne(unit.id, !!checked)}
                      aria-label={`Select unit ${unit.unit_number}`}
                    />
                </TableCell>
                <TableCell className="font-medium">{getPropertyName(unit.property_id)}</TableCell>
                <TableCell>{unit.unit_number}</TableCell>
                <TableCell className="text-xs text-slate-600">
                  {hasSpecs ? (
                      <div className="grid grid-cols-2 gap-x-2">
                          {unit.num_rooms > 0 && <span>{unit.num_rooms} {t('rooms')}</span>}
                          {unit.num_halls > 0 && <span>{unit.num_halls} {t('halls')}</span>}
                          {unit.num_kitchens > 0 && <span>{unit.num_kitchens} {t('kitchens')}</span>}
                          {unit.num_bathrooms > 0 && <span>{unit.num_bathrooms} {t('baths')}</span>}
                      </div>
                  ) : (
                      <span className="text-slate-400 italic">{t('standard')}</span>
                  )}
                </TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1">
                        {unit.furnished && <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-100">{t('furnished')}</Badge>}
                        {unit.has_parking && <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-100">{t('parking')}</Badge>}
                    </div>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="bg-slate-50">{t(unit.occupancy_type?.toLowerCase() as any) || 'Any'}</Badge>
                </TableCell>
                <TableCell>{getTenantName(unit.id)}</TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">SAR {displayRent?.toLocaleString()}</span>
                        {isOccupied && <span className="text-[10px] text-blue-600 font-medium">(Contract)</span>}
                        {!isOccupied && <span className="text-[10px] text-slate-400 italic">(Market)</span>}
                    </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={unit.status === 'occupied' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'}
                  >
                    {t(unit.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(unit)}>
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(unit)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}