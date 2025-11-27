
import React, { useMemo, useState } from "react";
import { useQuery } from "../hooks/useApi";
import { base44 } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Users, Building2 } from "../components/Icons";
import { Tenant, Contract, Unit, Property } from "../types";

export default function History() {
  const [tenantSearch, setTenantSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  
  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({ queryKey: ['tenants'], queryFn: () => base44.entities.Tenant.list() });
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({ queryKey: ['contracts'], queryFn: () => base44.entities.Contract.list() });
  const { data: units = [], isLoading: loadingUnits } = useQuery<Unit[]>({ queryKey: ['units'], queryFn: () => base44.entities.Unit.list() });
  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({ queryKey: ['properties'], queryFn: () => base44.entities.Property.list() });
  
  const isLoading = loadingTenants || loadingContracts || loadingUnits || loadingProperties;

  const archivedTenants = useMemo(() => {
    const inactiveContracts = contracts.filter(c => c.status === 'expired' || c.status === 'terminated');
    const inactiveTenantIds = new Set(inactiveContracts.map(c => c.tenant_id));
    const allArchived = tenants.filter(t => inactiveTenantIds.has(t.id));
    if (!tenantSearch) return allArchived;
    const lowercasedSearch = tenantSearch.toLowerCase();
    return allArchived.filter(t => 
        t.name.toLowerCase().includes(lowercasedSearch) ||
        t.iqama_number.includes(lowercasedSearch) ||
        t.phone.includes(lowercasedSearch)
    );
  }, [tenants, contracts, tenantSearch]);

  const archivedProperties = useMemo(() => {
    const propertyUnitCount = properties.reduce((acc, p) => {
        acc[p.id] = { total: 0, vacant: 0 };
        return acc;
    }, {} as Record<string, {total: number, vacant: number}>);

    units.forEach(unit => {
        if(propertyUnitCount[unit.property_id]) {
            propertyUnitCount[unit.property_id].total++;
            if(unit.status === 'vacant') {
                 propertyUnitCount[unit.property_id].vacant++;
            }
        }
    });

    const allArchived = properties.filter(p => propertyUnitCount[p.id]?.total > 0 && propertyUnitCount[p.id]?.total === propertyUnitCount[p.id]?.vacant);
    if (!propertySearch) return allArchived;
    const lowercasedSearch = propertySearch.toLowerCase();
    return allArchived.filter(p => 
        p.name.toLowerCase().includes(lowercasedSearch) ||
        p.address.toLowerCase().includes(lowercasedSearch)
    );
  }, [properties, units, propertySearch]);
  
  return (
    <div className="p-6 lg:p-8 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">History & Archive</h1>
          <p className="text-slate-600 mt-1">View historical data for inactive tenants and properties.</p>
        </div>

        <Card className="shadow-md border-none">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Archived Tenants
                </CardTitle>
                 <div className="w-full max-w-xs">
                    <Input 
                        type="search"
                        placeholder="Search archived tenants..."
                        value={tenantSearch}
                        onChange={(e) => setTenantSearch(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : archivedTenants.length > 0 ? (
                 <div className="rounded-lg border border-slate-200 overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Iqama #</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {archivedTenants.map(tenant => (
                            <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.name}</TableCell>
                                <TableCell>{tenant.phone}</TableCell>
                                <TableCell>{tenant.iqama_number}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className='bg-gray-100 text-gray-800'>
                                        Inactive
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            ) : <p className="text-center py-8 text-slate-500">No archived tenants found.</p>}
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-none">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Archived Properties (Fully Vacant)
                </CardTitle>
                <div className="w-full max-w-xs">
                    <Input 
                        type="search"
                        placeholder="Search archived properties..."
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-40 w-full" /> : archivedProperties.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {archivedProperties.map(prop => (
                            <TableRow key={prop.id}>
                                <TableCell className="font-medium">{prop.name}</TableCell>
                                <TableCell>{prop.address}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                        Fully Vacant
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            ) : <p className="text-center py-8 text-slate-500">No fully vacant properties found.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
