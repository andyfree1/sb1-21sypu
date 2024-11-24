import React, { useEffect } from 'react';
import { Calendar, Info } from 'lucide-react';
import type { DateRange, ReportPeriod } from '../types/sales';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  reportPeriods: ReportPeriod[];
  selectedPeriod: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

export default function DateRangeSelector({
  selectedRange,
  onRangeChange,
  customStartDate,
  onCustomStartDateChange,
  reportPeriods,
  selectedPeriod,
  onPeriodChange,
}: DateRangeSelectorProps) {
  // Store the last valid period to prevent resetting
  const lastValidPeriodRef = React.useRef<ReportPeriod | null>(null);

  useEffect(() => {
    if (selectedPeriod && !lastValidPeriodRef.current) {
      lastValidPeriodRef.current = selectedPeriod;
    }
  }, [selectedPeriod]);

  const handleRangeChange = (newRange: DateRange) => {
    onRangeChange(newRange);
    
    // Maintain the current period if switching back to monthly
    if (newRange === 'monthly' && lastValidPeriodRef.current) {
      const matchingPeriod = reportPeriods.find(p => p.title === lastValidPeriodRef.current?.title);
      if (matchingPeriod) {
        onPeriodChange(matchingPeriod);
      } else {
        onPeriodChange(reportPeriods[new Date().getMonth()]);
      }
    }
  };

  const handlePeriodChange = (title: string) => {
    const period = reportPeriods.find(p => p.title === title);
    if (period) {
      lastValidPeriodRef.current = period;
      onPeriodChange(period);
      localStorage.setItem('lastSelectedPeriod', period.title);
    }
  };

  // Restore last selected period on component mount
  useEffect(() => {
    if (selectedRange === 'monthly') {
      const lastPeriod = localStorage.getItem('lastSelectedPeriod');
      if (lastPeriod) {
        const period = reportPeriods.find(p => p.title === lastPeriod);
        if (period && (!selectedPeriod || selectedPeriod.title !== period.title)) {
          lastValidPeriodRef.current = period;
          onPeriodChange(period);
        }
      }
    }
  }, [reportPeriods]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-[#002C51]" />
          <select
            value={selectedRange}
            onChange={(e) => handleRangeChange(e.target.value as DateRange)}
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-[#002C51] focus:ring-[#002C51] sm:text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="45day">45 Day Rolling</option>
            <option value="90day">90 Day Rolling</option>
          </select>
        </div>
        
        {selectedRange === 'monthly' && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Period:</span>
            <select
              value={selectedPeriod?.title || ''}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-[#002C51] focus:ring-[#002C51] sm:text-sm"
            >
              {reportPeriods.map((period) => (
                <option key={period.title} value={period.title}>
                  {period.title}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {(selectedRange === '45day' || selectedRange === '90day') && (
          <>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-[#002C51] focus:ring-[#002C51] sm:text-sm"
              />
            </div>
            
            {selectedPeriod && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Info className="h-4 w-4" />
                <span>End Date: {format(selectedPeriod.endDate, 'MM/dd/yyyy')}</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {selectedPeriod && (
        <div className="mt-4 text-lg font-semibold text-[#002C51]">
          {selectedPeriod.title}
        </div>
      )}
    </div>
  );
}