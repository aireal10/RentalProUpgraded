
import React from "react";
import { useQuery } from "../hooks/useApi";
import { useSettings } from "../context/SettingsContext";
import { base44 } from "../services/api";
import { Building2, Home, Users, DoorOpen, DollarSign, TrendingDown, TrendingUp, AlertCircle, Receipt } from "../components/Icons";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { NewsTicker } from "../components/ui/NewsTicker";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Property, Unit, Contract, Invoice, Expense, NewsArticle, Tenant } from "../types";
import { DateDisplay } from "../components/ui/DateDisplay";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils/helpers";

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string; }) => (
  <Card className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow h-36 flex flex-col">
    <CardContent className="p-4 flex-1 flex flex-col justify-between relative z-10">
      <div className="flex justify-between items-start">
         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
         <div className={`p-2 ${color} bg-opacity-10 rounded-lg`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
         </div>
      </div>
      <div>
         <div className="text-2xl font-bold text-slate-900 leading-tight ltr:font-sans rtl:font-sans">{value}</div>
      </div>
    </CardContent>
    {/* Decorative background blob */}
    <div className={`absolute -bottom-4 -right-4 rtl:-right-auto rtl:-left-4 w-24 h-24 ${color} opacity-5 rounded-full pointer-events-none`} />
  </Card>
);

export default function Dashboard() {
  const { t, formatCurrency } = useSettings();
  
  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => base44.entities.Unit.list(),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list(),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: news = [], isLoading: loadingNews } = useQuery<NewsArticle[]>({
    queryKey: ['news'],
    queryFn: () => base44.external.getRealEstateNews(),
  });


  const isLoading = loadingProperties || loadingUnits || loadingContracts || loadingInvoices || loadingExpenses || loadingNews;

  // Calculate KPIs
  const totalProperties = properties.length;
  const totalUnits = units.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  
  const totalIncome = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const outstandingRent = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.amount - (inv.paid_amount || 0)), 0);

  const occupancyData = [
    { name: t('occupied'), value: occupiedUnits, color: '#10b981' },
    { name: t('vacant'), value: vacantUnits, color: '#ef4444' },
  ];

   const cashFlowData = React.useMemo(() => {
    const months: { name: string, year: number, month: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            name: d.toLocaleString('default', { month: 'short' }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }

    return months.map(({ name, year, month }) => {
        const monthlyIncome = invoices
            .filter(inv => {
                if (inv.status !== 'paid') return false;
                const paidDate = new Date(inv.created_at);
                return paidDate.getFullYear() === year && paidDate.getMonth() === month;
            })
            .reduce((sum, inv) => sum + inv.paid_amount, 0);

        const monthlyExpenses = expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getFullYear() === year && expDate.getMonth() === month;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        return {
            month: name,
            income: monthlyIncome,
            expenses: monthlyExpenses,
        };
    });
  }, [invoices, expenses]);

  const upcomingInvoices = React.useMemo(() => {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      return invoices
        .filter(inv => {
            if(inv.status === 'paid') return false;
            const d = new Date(inv.due_date);
            return d >= today && d <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5)
        .map(inv => {
            const contract = contracts.find(c => c.id === inv.contract_id);
            const tenant = tenants.find(t => t.id === contract?.tenant_id);
            return { ...inv, tenantName: tenant?.name || 'Unknown' };
        });
  }, [invoices, contracts, tenants]);


  return (
    <div className="p-4 bg-slate-50 h-full overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto space-y-4 w-full flex-1 flex flex-col">
        <div className="flex-shrink-0">
            <NewsTicker news={news} isLoading={loadingNews} />
        </div>

        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : (
            <>
              <StatCard title={t('properties')} value={totalProperties} icon={Building2} color="bg-blue-500" />
              <StatCard title={t('units')} value={totalUnits} icon={Home} color="bg-purple-500" />
              <StatCard title={t('activeTenants')} value={activeContracts} icon={Users} color="bg-green-500" />
              <StatCard title={t('vacantUnits')} value={vacantUnits} icon={DoorOpen} color="bg-orange-500" />
              <StatCard title={t('totalIncome')} value={formatCurrency(totalIncome)} icon={TrendingUp} color="bg-emerald-500" />
              <StatCard title={t('totalExpenses')} value={formatCurrency(totalExpenses)} icon={TrendingDown} color="bg-red-500" />
              <StatCard title={t('netProfit')} value={formatCurrency(netProfit)} icon={DollarSign} color={netProfit >= 0 ? "bg-green-500" : "bg-red-500"} />
              <StatCard title={t('outstanding')} value={formatCurrency(outstandingRent)} icon={AlertCircle} color="bg-amber-500" />
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-4 flex-1 min-h-0">
           <Card className="shadow-sm border-none lg:col-span-1 flex flex-col h-full bg-white/80 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800">{t('rentDue30')}</CardTitle>
              <Receipt className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
               {upcomingInvoices.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                      {upcomingInvoices.map(inv => (
                          <li key={inv.id} className="p-3 hover:bg-slate-50 transition-colors">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-xs text-slate-700 truncate max-w-[120px]">{inv.tenantName}</span>
                                  <span className="font-bold text-xs text-red-600">{formatCurrency(inv.amount)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400">{t('dueDate')}: <DateDisplay dateString={inv.due_date} /></span>
                                  <Link to={createPageUrl("RentPayments")} className="text-[10px] text-blue-600 hover:underline">{t('view')}</Link>
                              </div>
                          </li>
                      ))}
                  </ul>
               ) : (
                   <div className="flex items-center justify-center h-full text-xs text-slate-400 p-4 text-center">
                       {t('noRentDue')}
                   </div>
               )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none lg:col-span-1 flex flex-col h-full bg-white/80 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 border-b flex-shrink-0">
              <CardTitle className="text-sm font-bold text-slate-800">{t('occupancyRate')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-[200px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 500}}/>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none lg:col-span-2 flex flex-col h-full bg-white/80 backdrop-blur-sm">
            <CardHeader className="py-3 px-4 border-b flex-shrink-0">
              <CardTitle className="text-sm font-bold text-slate-800">{t('cashFlow')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 min-h-[200px]">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', borderRadius: '8px', fontSize: '12px', padding: '8px 12px' }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                      cursor={{fill: '#f1f5f9'}}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" height={30} wrapperStyle={{fontSize: '11px', fontWeight: 500}}/>
                    <Bar dataKey="income" fill="#10b981" name={t('totalIncome')} radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="expenses" fill="#ef4444" name={t('expenses')} radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
