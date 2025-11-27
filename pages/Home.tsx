
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, LayoutDashboard, TrendingUp, Users } from '../components/Icons';

const FeatureCard = ({ icon: Icon, title, description, link, linkText }: { icon: React.ElementType; title: string; description: string; link: string; linkText: string; }) => (
    <Card className="shadow-lg border-none hover:shadow-xl transition-shadow duration-300 flex flex-col">
        <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-slate-600">{description}</p>
        </CardContent>
        <div className="p-6 pt-0">
             <Link to={link}>
                <Button variant="outline" className="w-full">
                    {linkText}
                </Button>
            </Link>
        </div>
    </Card>
);


export default function Home() {
  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12 md:py-20 border-b border-slate-200">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Welcome to RentalPro
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Your all-in-one solution for efficient property management. Track properties, manage tenants, and monitor your finances with ease.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700 text-base px-8 py-6">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                View Dashboard
              </Button>
            </Link>
            <Link to="/properties">
              <Button variant="outline" className="text-base px-8 py-6">
                <Building2 className="w-5 h-5 mr-2" />
                Manage Properties
              </Button>
            </Link>
          </div>
        </div>

        <div className="py-12 md:py-16">
            <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">
                Key Features at a Glance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Building2}
                    title="Property & Unit Hub"
                    description="Centralize all your property and unit information. Track status, rent details, and lease information in one place."
                    link="/properties"
                    linkText="Go to Properties"
                />
                <FeatureCard 
                    icon={Users}
                    title="Tenant & Contract Management"
                    description="Keep detailed records of tenants, manage contracts, and automatically generate invoices to stay on top of payments."
                    link="/tenants"
                    linkText="Go to Tenants"
                />
                 <FeatureCard 
                    icon={TrendingUp}
                    title="Financial Reporting"
                    description="Gain insights into your portfolio's performance with detailed reports on income, expenses, and profitability."
                    link="/reports"
                    linkText="View Reports"
                />
            </div>
        </div>
      </div>
    </div>
  );
}
