import React, { useState, useEffect, useCallback } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Switch } from './switch';
import { Select } from './select';
import { gregorianToHijri, hijriToGregorian, toYMD, HIJRI_MONTHS } from '../../utils/helpers';

const toGregorianDisplay = (gregorianDate: string): string => {
    if (!gregorianDate) return '';
    try {
        const date = new Date(gregorianDate + 'T00:00:00');
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch (e) { return ''; }
};

const toHijriDisplay = (gregorianDate: string): string => {
    if (!gregorianDate) return '';
    try {
        const [gYear, gMonth, gDay] = gregorianDate.split('-').map(Number);
        const hijri = gregorianToHijri(gYear, gMonth, gDay);
        if (!hijri) return '';
        return `${hijri.hDay} ${HIJRI_MONTHS[hijri.hMonth - 1]} ${hijri.hYear}H`;
    } catch(e) { return '' }
};

interface HijriState {
    day: string;
    month: string;
    year: string;
}

interface DatePickerWithHijriProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DatePickerWithHijri = React.forwardRef<HTMLInputElement, DatePickerWithHijriProps>(({ label, value, onChange, ...props }, ref) => {
    const [useHijri, setUseHijri] = useState(false);
    const [hijriState, setHijriState] = useState<HijriState>({ day: '', month: '', year: '' });

    // When Gregorian value changes, update Hijri state
    useEffect(() => {
        if (value && typeof value === 'string') {
            const [gYear, gMonth, gDay] = value.split('-').map(Number);
            if (!isNaN(gYear) && !isNaN(gMonth) && !isNaN(gDay)) {
                const hijri = gregorianToHijri(gYear, gMonth, gDay);
                if (hijri) {
                    setHijriState({
                        day: String(hijri.hDay),
                        month: String(hijri.hMonth),
                        year: String(hijri.hYear)
                    });
                }
            }
        }
    }, [value]);

    // When Hijri state changes, update Gregorian value via onChange prop
    const handleHijriChange = useCallback((part: keyof HijriState, newValue: string) => {
        const newHijriState = { ...hijriState, [part]: newValue };
        setHijriState(newHijriState);

        const { year, month, day } = newHijriState;
        if (year && month && day) {
            const hYear = parseInt(year, 10);
            const hMonth = parseInt(month, 10);
            const hDay = parseInt(day, 10);
            
            if (!isNaN(hYear) && !isNaN(hMonth) && !isNaN(hDay) && hDay > 0 && hDay <= 30) {
                const gregorian = hijriToGregorian(hYear, hMonth, hDay);
                if (gregorian) {
                    const gregorianString = toYMD({ year: gregorian.gYear, month: gregorian.gMonth, day: gregorian.gDay });
                    // Simulate a change event to be compatible with form handlers
                    const event = {
                        target: { 
                            value: gregorianString, 
                            name: props.name || props.id,
                            id: props.id,
                            type: 'date'
                         }
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    onChange(event);
                }
            }
        }
    }, [hijriState, onChange, props.name, props.id]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={props.id}>{label}</Label>
                <div className="flex items-center space-x-2">
                    <Label htmlFor={`${props.id}-hijri-toggle`} className="text-xs font-normal text-slate-500 cursor-pointer">
                        Use Hijri
                    </Label>
                    <Switch
                        id={`${props.id}-hijri-toggle`}
                        checked={useHijri}
                        onCheckedChange={setUseHijri}
                    />
                </div>
            </div>

            {!useHijri ? (
                <Input type="date" ref={ref} value={value} onChange={onChange} {...props} />
            ) : (
                <div className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-slate-50">
                    <div>
                        <Label htmlFor={`${props.id}-hijri-day`} className="text-xs text-slate-500">Day</Label>
                        <Input 
                            id={`${props.id}-hijri-day`} 
                            type="number" 
                            min="1" max="30"
                            placeholder="DD"
                            value={hijriState.day}
                            onChange={(e) => handleHijriChange('day', e.target.value)}
                            required={props.required}
                        />
                    </div>
                    <div>
                        <Label htmlFor={`${props.id}-hijri-month`} className="text-xs text-slate-500">Month</Label>
                        <Select
                            id={`${props.id}-hijri-month`}
                            value={hijriState.month}
                            onChange={(e) => handleHijriChange('month', e.target.value)}
                            required={props.required}
                            className="h-10"
                        >
                            <option value="" disabled>Select...</option>
                            {HIJRI_MONTHS.map((month, index) => (
                                <option key={month} value={index + 1}>{month}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor={`${props.id}-hijri-year`} className="text-xs text-slate-500">Year</Label>
                        <Input
                            id={`${props.id}-hijri-year`}
                            type="number"
                            min="1300" max="1500"
                            placeholder="YYYY"
                            value={hijriState.year}
                            onChange={(e) => handleHijriChange('year', e.target.value)}
                            required={props.required}
                        />
                    </div>
                </div>
            )}
             {value && (
                <div className="text-sm text-slate-600 text-center p-2 bg-slate-100 border rounded-md">
                   {useHijri
                        ? `Gregorian: ${toGregorianDisplay(value as string)}`
                        : `Hijri: ${toHijriDisplay(value as string)}`}
                </div>
            )}
        </div>
    );
});
DatePickerWithHijri.displayName = 'DatePickerWithHijri';