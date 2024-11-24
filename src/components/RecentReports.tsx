import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { hiltonMediaStorage } from '../db/mediaStorage';
import { format, isValid } from 'date-fns';

interface RecentReport {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  metadata: {
    totalSales: number;
    totalVolume: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export default function RecentReports() {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentReports();
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        return 'Invalid date';
      }
      return format(date, 'MM/dd/yyyy');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const loadRecentReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const reports = await hiltonMediaStorage.listFiles('/reports/saved');
      const sortedReports = reports
        .filter(report => {
          try {
            return report.type === 'file' && 
                   report.content?.metadata?.dateRange?.start && 
                   report.content?.metadata?.dateRange?.end;
          } catch (error) {
            console.error('Invalid report data:', error);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } catch (error) {
            return 0;
          }
        })
        .slice(0, 4)
        .map(report => ({
          id: report.id || String(Date.now()),
          name: report.content.name || 'Untitled Report',
          path: report.path,
          createdAt: report.createdAt || new Date().toISOString(),
          metadata: {
            totalSales: report.content.metadata.totalSales || 0,
            totalVolume: report.content.metadata.totalVolume || 0,
            dateRange: {
              start: report.content.metadata.dateRange.start,
              end: report.content.metadata.dateRange.end
            }
          }
        }));
      
      setRecentReports(sortedReports);
    } catch (error) {
      console.error('Failed to load recent reports:', error);
      setError('Failed to load recent reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (report: RecentReport) => {
    try {
      const reportData = await hiltonMediaStorage.getFile(report.path);
      if (!reportData?.content) {
        throw new Error('Report data not found');
      }

      // Create a blob URL for the report data
      const blob = new Blob([JSON.stringify(reportData.content, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(url, '_blank');
      
      // Clean up the blob URL after ensuring the window opened
      if (newWindow) {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        URL.revokeObjectURL(url);
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
    } catch (error) {
      console.error('Failed to open report:', error);
      alert('Failed to open report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002C51]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="text-red-600 text-center py-4">{error}</div>
      </div>
    );
  }

  if (recentReports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="text-gray-500 text-center py-4">No recent reports available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Clock className="h-4 w-4 mr-1" />
        <span>Recent Reports</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {recentReports.map((report) => (
          <button
            key={report.id}
            onClick={() => handleOpenReport(report)}
            className="text-left p-2 rounded hover:bg-gray-50 border border-gray-100 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{report.name}</span>
              <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(report.createdAt)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {report.metadata.totalSales} sales • ${report.metadata.totalVolume.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatDate(report.metadata.dateRange.start)} - {formatDate(report.metadata.dateRange.end)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}