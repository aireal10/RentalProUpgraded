
import React, { useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { base44 } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Globe, DownloadCloud, UploadCloud, Loader2, AlertCircle } from '../components/Icons';

export default function Settings() {
  const { language, setLanguage, currency, setCurrency, t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
        const data = await base44.system.backup();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rentalpro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert("Failed to create backup.");
        console.error(error);
    }
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsRestoring(true);
      setRestoreError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              await base44.system.restore(json);
              // Reload to apply changes
              window.location.reload();
          } catch (error) {
              console.error(error);
              setRestoreError("Failed to restore data. Invalid file format.");
              setIsRestoring(false);
          }
      };
      reader.onerror = () => {
          setRestoreError("Error reading file.");
          setIsRestoring(false);
      };
      reader.readAsText(file);
      
      // Reset input
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50 h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('settings')}</h1>
          <p className="text-slate-600 mt-1">Manage system preferences and data</p>
        </div>

        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-white pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-blue-600" />
              Localization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">System Language / اللغة</Label>
                <div className="relative">
                  <Select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                    className="w-full h-11 bg-slate-50 border-slate-200 focus:ring-blue-500"
                  >
                    <option value="en">English (US)</option>
                    <option value="ar">العربية (Arabic)</option>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">
                  {language === 'en' 
                    ? "Select the interface language. The layout will adjust automatically (LTR/RTL)." 
                    : "اختر لغة الواجهة. سيتم تعديل التخطيط تلقائيًا (من اليمين لليسار)."}
                </p>
              </div>

              {/* Currency Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Display Currency</Label>
                <div className="relative">
                  <Select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full h-11 bg-slate-50 border-slate-200 focus:ring-blue-500"
                  >
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="AED">UAE Dirham (AED)</option>
                    <option value="QAR">Qatari Riyal (QAR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">
                  Display currency for reports and dashboards. Base data remains unchanged.
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
            <CardHeader className="border-b bg-white pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <DownloadCloud className="w-5 h-5 text-green-600" />
                    Data Backup & Restore
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <strong>Important:</strong> This application stores data locally in your browser. 
                    Regularly back up your data to prevent loss if you clear your browser cache or switch devices.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800">Export Data</h3>
                        <p className="text-xs text-slate-500 mb-3">Download a full copy of your data including properties, tenants, and contracts as a JSON file.</p>
                        <Button onClick={handleBackup} className="w-full bg-slate-800 hover:bg-slate-900">
                            <DownloadCloud className="w-4 h-4 mr-2" />
                            Download Backup
                        </Button>
                    </div>

                    <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <h3 className="text-sm font-semibold text-slate-800">Import Data</h3>
                        <p className="text-xs text-slate-500 mb-3">Restore your data from a previously downloaded backup file. <strong>This will overwrite current data.</strong></p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                        <Button onClick={handleRestoreClick} variant="outline" className="w-full" disabled={isRestoring}>
                            {isRestoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <UploadCloud className="w-4 h-4 mr-2" />}
                            {isRestoring ? 'Restoring...' : 'Restore from Backup'}
                        </Button>
                        {restoreError && (
                            <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
                                <AlertCircle className="w-3 h-3" />
                                {restoreError}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}