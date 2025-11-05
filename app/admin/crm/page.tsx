
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

type ValueFormat = 'number' | 'percentage' | 'currency';

interface SchoolOption {
  id: string;
  name: string;
}

interface SchoolsApiResponse {
  success: boolean;
  schools: Array<{ id: string; name: string | null }>;
}

interface TrendPoint {
  label: string;
  awareness: number;
  consideration: number;
  action: number;
}

interface SummaryComparison {
  current: number;
  previous: number;
}

interface LeadSource {
  source: string;
  count: number;
  percentage: number;
}

interface LeadDemographic {
  label: string;
  count: number;
  percentage: number;
}

interface GradeYearData {
  year: string;
  isProjection?: boolean | string;
  PG: number;
  TK: number;
  SD: number;
  SMP: number;
  SMA: number;
}

interface DashboardSummary {
  newPsbTarget: number;
  totalLeads: number;
  totalCampaigns: number;
  totalContents: number;
  totalPreRegistrations: number;
  preRegistrationRate: number;
  totalOfficial: number;
  officialRate: number;
  totalLeadsNeeded: number;
  officialConversionRate: number;
  yoyEnrollmentGrowth: number;
  yoyComparison: SummaryComparison;
  momEnrollmentGrowth: number;
  momComparison: SummaryComparison;
  topLeadSources: LeadSource[];
  leadDemographics: LeadDemographic[];
}

interface DashboardAwarenessStage {
  totalCampaignReach: number;
  instagramContents: number;
  tikTokContents: number;
  viralContents: number;
  websiteLeads: number;
}

interface DashboardConsiderationStage {
  whatsappLeads: number;
  openHouseEngagements: number;
  eventCampaigns: number;
  costPerLeadPre: number;
  schoolVisits: number;
}

interface DashboardConversionStage {
  officialConversionRate: number;
  officialPayments: number;
  scholarshipLeads: number;
  retentionRate: number;
  costPerOfficialLead: number;
  npsScore: number;
}

interface DashboardMetadata {
  totalCampaignBudget: number;
  convertedLeads: number;
  lostLeads: number;
  leadsToday: number;
}

interface DashboardSchool {
  id: string | null;
  name: string | null;
}

interface DashboardResponse {
  academicYear: string;
  school: DashboardSchool | null;
  summary: DashboardSummary;
  awarenessStage: DashboardAwarenessStage;
  considerationStage: DashboardConsiderationStage;
  conversionStage: DashboardConversionStage;
  conversionJourney: TrendPoint[];
  gradeGrowth: GradeYearData[];
  gradeLeadCounts: Record<string, number>;
  metadata: DashboardMetadata;
}

const accentPalette: Record<string, string> = {
  'bg-orange-400': '#fb923c',
  'bg-emerald-500': '#10b981',
  'bg-indigo-500': '#6366f1',
  'bg-sky-500': '#0ea5e9',
  'bg-violet-500': '#8b5cf6',
  'bg-amber-500': '#f59e0b',
};

const formatNumber = (value: number, fractionDigits = 0) => {
  const numeric = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
};

const formatPercentage = (value: number, fractionDigits = 1) => {
  const numeric = Number.isFinite(value) ? value : 0;
  return (
    new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(numeric) + '%'
  );
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatValue = (value: number, format?: ValueFormat) => {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percentage') return formatPercentage(value);
  return formatNumber(value);
};

const getAccentColor = (accentClass: string) => accentPalette[accentClass] ?? '#6366f1';

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
export default function CRMDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const schoolIdParam = searchParams.get('schoolId') ?? '';
  const isSuperadmin = session?.user?.role === 'SUPERADMIN';
  const selectedSchoolId = isSuperadmin ? schoolIdParam : session?.user?.schoolId ?? '';
  const activeSchoolId = isSuperadmin ? selectedSchoolId : '';

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSchools = async () => {
      if (!isSuperadmin || status !== 'authenticated') return;
      try {
        const response = await fetch('/api/schools', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load schools');
        const payload = (await response.json()) as SchoolsApiResponse;
        if (payload.success && Array.isArray(payload.schools)) {
          const options = payload.schools
            .filter((school): school is { id: string; name: string | null } => typeof school?.id === 'string')
            .map((school) => ({
              id: school.id,
              name: school.name ?? 'Tanpa Nama',
            }));
          setSchools(options);
        } else {
          setSchools([]);
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
        setSchools([]);
      }
    };

    fetchSchools();
  }, [isSuperadmin, status]);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (status !== 'authenticated') return;
      try {
        setLoading(true);
        setError(null);

        let url = '/api/crm/dashboard';
        if (isSuperadmin && activeSchoolId) {
          url += `?schoolId=${encodeURIComponent(activeSchoolId)}`;
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to load dashboard data');
        }

        const payload = (await response.json()) as DashboardResponse;
        setDashboard(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [status, isSuperadmin, activeSchoolId]);

  const updateSuperadminParams = (nextSchoolId: string) => {
    if (!isSuperadmin) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSchoolId) {
      params.set('schoolId', nextSchoolId);
      params.set('superadmin', 'true');
    } else {
      params.delete('schoolId');
      params.delete('superadmin');
    }
    const query = params.toString();
    router.replace(`/admin/crm${query ? `?${query}` : ''}`);
  };

  const buildNavigationHref = (basePath: string) => {
    if (!isSuperadmin) return basePath;
    const params = new URLSearchParams();
    if (activeSchoolId) params.set('schoolId', activeSchoolId);
    params.set('superadmin', 'true');
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  };

  const handleNavigate = (basePath: string) => {
    router.push(buildNavigationHref(basePath));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          <h2 className="mb-2 text-lg font-semibold">Unable to load dashboard</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const summaryCards = [
    {
      title: 'New PSB Target',
      primary: formatNumber(dashboard.summary.newPsbTarget),
    },
    {
      title: 'Total Leads in CRM',
      primary: formatNumber(dashboard.summary.totalLeads),
    },
    {
      title: 'Total Pre-Registration',
      primary: `${formatNumber(dashboard.summary.totalPreRegistrations)} (${formatPercentage(
        dashboard.summary.preRegistrationRate,
      )})`,
    },
    {
      title: 'Total Official (Payment)',
      primary: `${formatNumber(dashboard.summary.totalOfficial)} (${formatPercentage(
        dashboard.summary.officialRate,
      )})`,
    },
    {
      title: 'Official Conversion Rate',
      primary: formatPercentage(dashboard.summary.officialConversionRate),
    },
    {
      title: 'Total Leads Needed',
      primary: formatNumber(dashboard.summary.totalLeadsNeeded),
    },
    {
      title: 'YoY Enrollment Growth',
      primary: formatPercentage(dashboard.summary.yoyEnrollmentGrowth),
      secondary: `Year-to-date: ${formatNumber(dashboard.summary.yoyComparison.current)} | Last year: ${formatNumber(
        dashboard.summary.yoyComparison.previous,
      )}`,
    },
    {
      title: 'MoM Enrollment Growth',
      primary: formatPercentage(dashboard.summary.momEnrollmentGrowth),
      secondary: `This month: ${formatNumber(dashboard.summary.momComparison.current)} | Last month: ${formatNumber(
        dashboard.summary.momComparison.previous,
      )}`,
    },
  ];

  const awarenessCards = [
    {
      label: 'Reach',
      value: dashboard.awarenessStage.totalCampaignReach,
      helper: 'Total campaign reach recorded',
    },
    {
      label: 'Instagram Posts',
      value: dashboard.awarenessStage.instagramContents,
      helper: 'Contents published for Instagram',
    },
    {
      label: 'TikTok Posts',
      value: dashboard.awarenessStage.tikTokContents,
      helper: 'Contents published for TikTok',
    },
    {
      label: 'Viral Content',
      value: dashboard.awarenessStage.viralContents,
      helper: 'Tagged as viral (~500k views)',
    },
    {
      label: 'Website Leads (Monthly)',
      value: dashboard.awarenessStage.websiteLeads,
      helper: 'Leads sourced from website this month',
    },
  ];

  const considerationCards: Array<{
    label: string;
    value: number;
    format?: ValueFormat;
    helper?: string;
  }> = [
    {
      label: 'WhatsApp / DM',
      value: dashboard.considerationStage.whatsappLeads,
      helper: 'Leads engaged via WhatsApp/DM',
    },
    {
      label: 'Open House Engagement',
      value: dashboard.considerationStage.openHouseEngagements,
      helper: 'Combined campaigns & leads',
    },
    {
      label: 'Expo / Events',
      value: dashboard.considerationStage.eventCampaigns,
      helper: 'Active events logged',
    },
    {
      label: 'Cost per Lead (Pre)',
      value: dashboard.considerationStage.costPerLeadPre,
      format: 'currency',
      helper: 'Budget efficiency per pre-registered lead',
    },
    {
      label: 'School Visits',
      value: dashboard.considerationStage.schoolVisits,
      helper: 'Leads scheduled for on-site visit',
    },
  ];

  const conversionCards: Array<{
    label: string;
    value: number;
    format?: ValueFormat;
    helper?: string;
  }> = [
    {
      label: 'Official Conversion Rate',
      value: dashboard.conversionStage.officialConversionRate,
      format: 'percentage',
      helper: 'Converted against total leads',
    },
    {
      label: 'Official Payments',
      value: dashboard.conversionStage.officialPayments,
      helper: 'Leads marked as official/payment',
    },
    {
      label: 'Scholarship Leads',
      value: dashboard.conversionStage.scholarshipLeads,
      helper: 'Scholarship or beasiswa related leads',
    },
    {
      label: 'Retention Intention',
      value: dashboard.conversionStage.retentionRate,
      format: 'percentage',
      helper: 'Leads with continuation intent',
    },
    {
      label: 'Cost per Official Lead',
      value: dashboard.conversionStage.costPerOfficialLead,
      format: 'currency',
      helper: 'Budget efficiency per official payment',
    },
    {
      label: 'NPS (Net Promoter Score)',
      value: dashboard.conversionStage.npsScore,
      format: 'percentage',
      helper: 'Calculated from converted vs lost leads',
    },
  ];

  const topLeadSources = dashboard.summary.topLeadSources ?? [];
  const leadDemographics = dashboard.summary.leadDemographics ?? [];

  const metadataHighlights = [
    {
      label: 'Total Campaign Budget',
      value: formatCurrency(dashboard.metadata.totalCampaignBudget),
    },
    {
      label: 'New Leads',
      value: formatNumber(dashboard.metadata.leadsToday),
    },
    {
      label: 'Lost Leads',
      value: formatNumber(dashboard.metadata.lostLeads),
    },
  ];
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <header className="rounded-3xl bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-500 p-[1px] shadow-xl">
          <div className="rounded-[26px] bg-white/90 px-8 py-6 backdrop-blur">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
                  Academic Year {dashboard.academicYear}
                </p>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">CRM Growth Performance</h1>
                {dashboard.school?.name ? (
                  <p className="mt-1 text-sm text-slate-600">School: {dashboard.school.name}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Network overview across all schools</p>
                )}
              </div>
              {isSuperadmin ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label htmlFor="school-filter" className="text-xs font-semibold uppercase text-slate-500">
                    Filter Sekolah
                  </label>
                  <select
                    id="school-filter"
                    value={selectedSchoolId}
                    onChange={(event) => updateSuperadminParams(event.target.value)}
                    className="w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Semua Sekolah</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Total Campaigns',
                  value: formatNumber(dashboard.summary.totalCampaigns),
                },
                {
                  label: 'Total Contents',
                  value: formatNumber(dashboard.summary.totalContents),
                },
                {
                  label: 'Total Leads',
                  value: formatNumber(dashboard.summary.totalLeads),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-sm"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {metadataHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-indigo-100 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-sm"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    {item.label}
                  </span>
                  <span className="mt-2 block text-lg font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <main className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Executive Summary
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.slice(0, 4).map((card) => (
                  <SummaryCard
                    key={card.title}
                    title={card.title}
                    primary={card.primary}
                    secondary={card.secondary}
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.slice(4).map((card) => (
                  <SummaryCard
                    key={card.title}
                    title={card.title}
                    primary={card.primary}
                    secondary={card.secondary}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Funnel Performance
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <StageChart
                  title="Awareness"
                  subtitle={`Total Leads dalam CRM: ${formatNumber(dashboard.summary.totalLeads)} leads`}
                  data={dashboard.conversionJourney}
                  dataKey="awareness"
                  accentClass="bg-orange-400"
                />
                <StageChart
                  title="Consideration"
                  subtitle={`Pre-Registration Rate: ${formatPercentage(dashboard.summary.preRegistrationRate, 0)}`}
                  data={dashboard.conversionJourney}
                  dataKey="consideration"
                  accentClass="bg-emerald-500"
                />
                <StageChart
                  title="Action"
                  subtitle={`Official Rate: ${formatPercentage(dashboard.summary.officialRate, 0)}`}
                  data={dashboard.conversionJourney}
                  dataKey="action"
                  accentClass="bg-indigo-500"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Current Leads by Grade
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { grade: 'PG', label: 'PG', color: '#9CA3AF', bgColor: 'bg-slate-50' },
                  { grade: 'TK', label: 'TK', color: '#06B6D4', bgColor: 'bg-cyan-50' },
                  { grade: 'SD', label: 'SD', color: '#3B82F6', bgColor: 'bg-blue-50' },
                  { grade: 'SMP', label: 'SMP', color: '#1E40AF', bgColor: 'bg-blue-100' },
                  { grade: 'SMA', label: 'SMA', color: '#1E3A8A', bgColor: 'bg-blue-200' },
                ].map(({ grade, label, color, bgColor }) => {
                  const count = dashboard.gradeLeadCounts[grade] || 0
                  const totalLeads = dashboard.summary.totalLeads || 0
                  const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                  
                  return (
                    <div
                      key={grade}
                      className={`relative overflow-hidden rounded-xl border border-slate-200 ${bgColor} p-4 transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-xs font-semibold text-slate-600">{label}</p>
                          </div>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{percentage}% of total</p>
                        </div>
                        <div className="absolute right-3 top-3 opacity-20">
                          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Top Lead Sources</h3>
                <p className="text-xs text-slate-500">Kontribusi tertinggi dalam periode berjalan.</p>
                <ul className="mt-4 space-y-3">
                  {topLeadSources.length === 0 ? (
                    <li className="text-sm text-slate-500">Belum ada data sumber lead yang tercatat.</li>
                  ) : (
                    topLeadSources.map((item) => (
                      <li key={item.source} className="flex items-center justify-between text-sm text-slate-700">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden />
                          {item.source}
                        </span>
                        <span className="font-medium">
                          {formatPercentage(item.percentage, 0)} | {formatNumber(item.count)} leads
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Demografi Leads</h3>
                <p className="text-xs text-slate-500">Distribusi berdasarkan kategori utama.</p>
                <ul className="mt-4 space-y-3">
                  {leadDemographics.length === 0 ? (
                    <li className="text-sm text-slate-500">Belum ada data demografi yang tercatat.</li>
                  ) : (
                    leadDemographics.map((item) => (
                      <li key={item.label} className="flex items-center justify-between text-sm text-slate-700">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden />
                          {item.label}
                        </span>
                        <span className="font-medium">
                          {formatPercentage(item.percentage, 0)} | {formatNumber(item.count)} leads
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                PSB Growth by Grade Level
              </h2>
              <GradeGrowthChart data={dashboard.gradeGrowth} />
            </section>
          </main>

          <aside className="space-y-6">
            <RadialProgressCard
              title="Pre-Registration Conversion"
              percentage={dashboard.summary.preRegistrationRate}
              subtitle={`${formatNumber(dashboard.summary.totalPreRegistrations)} pre-registrations`}
              helper="Proporsi leads yang berhasil diarahkan ke pra-registrasi."
              color="#10B981"
            />
            <RadialProgressCard
              title="Official Conversion"
              percentage={dashboard.summary.officialRate}
              subtitle={`${formatNumber(dashboard.summary.totalOfficial)} official payments`}
              helper="Persentase leads yang menyelesaikan pembayaran resmi."
              color="#6366F1"
            />
            <SparklineCard
              title="Official Payments Trend"
              subtitle="Tren 12 bulan terakhir"
              values={dashboard.conversionJourney.map((item) => item.action)}
              labels={dashboard.conversionJourney.map((item) => item.label)}
              color="#6366F1"
              footer="Pantau momentum pembayaran resmi dan identifikasi bulan terkuat."
            />
            
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Stage Health Overview
              </h3>
              
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-500">Awareness Stage</h4>
                <div className="space-y-3">
                  {awarenessCards.map((card) => (
                    <div key={card.label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{card.label}</p>
                        {card.helper && <p className="text-[10px] text-slate-500">{card.helper}</p>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatNumber(card.value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-500">Consideration Stage</h4>
                <div className="space-y-3">
                  {considerationCards.map((card) => (
                    <div key={card.label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{card.label}</p>
                        {card.helper && <p className="text-[10px] text-slate-500">{card.helper}</p>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(card.value, card.format)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-500">Conversion Stage</h4>
                <div className="space-y-3">
                  {conversionCards.map((card) => (
                    <div key={card.label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{card.label}</p>
                        {card.helper && <p className="text-[10px] text-slate-500">{card.helper}</p>}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(card.value, card.format)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
interface SummaryCardProps {
  title: string;
  primary: string;
  secondary?: string;
}

function SummaryCard({ title, primary, secondary }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{primary}</p>
      {secondary ? <p className="mt-1 text-xs text-slate-500">{secondary}</p> : null}
    </div>
  );
}

interface StageCardProps {
  label: string;
  value: number;
  helper?: string;
  format?: ValueFormat;
  accentClass?: string;
}

function StageCard({ label, value, helper, format, accentClass = 'bg-indigo-500' }: StageCardProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${accentClass}`} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="mt-4 text-xl font-semibold text-slate-900">{formatValue(value, format)}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

interface StageChartProps {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  dataKey: keyof TrendPoint;
  accentClass: string;
}

function StageChart({ title, subtitle, data, dataKey, accentClass }: StageChartProps) {
  const accentColor = useMemo(() => getAccentColor(accentClass), [accentClass]);

  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .slice(-12)
      .map((point) => ({
        label: point.label,
        value: Number(point[dataKey] ?? 0),
      }));
  }, [data, dataKey]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const currentMonthPoint = useMemo(() => {
    if (!chartData.length) return null;
    const now = new Date();
    const currentMonthLabel = now.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
    const currentPoint = chartData.find(point => point.label === currentMonthLabel);
    return currentPoint || chartData[chartData.length - 1];
  }, [chartData]);

  const activePoint = useMemo(() => {
    if (!chartData.length) return null;
    if (activeIndex == null) return currentMonthPoint;
    const safeIndex = Math.min(Math.max(activeIndex, 0), chartData.length - 1);
    return chartData[safeIndex];
  }, [chartData, activeIndex, currentMonthPoint]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state?: any) => {
    if (typeof state?.activeTooltipIndex === 'number') {
      setActiveIndex(state.activeTooltipIndex);
    }
  }, []);

  const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

  return (
    <div className="h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${accentClass}`} aria-hidden />
      </div>
      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-slate-900">
          {formatNumber(activePoint?.value ?? 0)}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {activePoint?.label ?? 'Tidak ada data'}
        </span>
      </div>
      <div className="mt-6 h-48">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Data belum tersedia
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              onMouseMove={handleMouseMove} 
              onMouseLeave={handleMouseLeave}
              margin={{ top: 5, right: 5, left: 15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 7 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: hexToRgba(accentColor, 0.12) }}
                wrapperStyle={{ outline: 'none' }}
                content={(props) => <StageTooltip {...props} color={accentColor} />}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]} fill={accentColor} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface StageTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: ValueType }>;
  label?: NameType;
  color: string;
}

function StageTooltip({ active, payload, label, color }: StageTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2 font-medium text-slate-700">
        <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(value)}</div>
    </div>
  );
}
interface RadialProgressCardProps {
  title: string;
  percentage: number;
  subtitle: string;
  helper: string;
  color: string;
}

function RadialProgressCard({ title, percentage, subtitle, helper, color }: RadialProgressCardProps) {
  const safePercentage = Math.max(0, Math.min(Number.isFinite(percentage) ? percentage : 0, 100));
  const angle = (safePercentage / 100) * 360;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${angle}deg, #E2E8F0 ${angle}deg)`,
          }}
        >
          <div className="absolute h-16 w-16 rounded-full bg-white" />
          <span className="relative text-lg font-semibold text-slate-900">
            {formatPercentage(safePercentage, 0)}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{subtitle}</p>
          <p className="text-xs text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

interface SparklineCardProps {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  color: string;
  footer?: string;
}

function SparklineCard({ title, subtitle, values, labels, color, footer }: SparklineCardProps) {
  const chartData = useMemo(() => {
    const length = Math.min(values.length, labels.length);
    const startIndex = Math.max(0, length - 12);
    const points: Array<{ label: string; value: number }> = [];
    for (let index = startIndex; index < length; index += 1) {
      points.push({
        label: labels[index],
        value: Number(values[index] ?? 0),
      });
    }
    return points;
  }, [labels, values]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activePoint = useMemo(() => {
    if (!chartData.length || activeIndex == null) return null;
    const safeIndex = Math.min(Math.max(activeIndex, 0), chartData.length - 1);
    return chartData[safeIndex];
  }, [chartData, activeIndex]);

  const selectedPoint = useMemo(() => {
    if (!chartData.length || selectedIndex == null) return null;
    const safeIndex = Math.min(Math.max(selectedIndex, 0), chartData.length - 1);
    return chartData[safeIndex];
  }, [chartData, selectedIndex]);

  const highlightPoint = activePoint ?? selectedPoint;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((state?: any) => {
    if (typeof state?.activeTooltipIndex === 'number') {
      setActiveIndex(state.activeTooltipIndex);
    }
  }, []);

  const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = useCallback((state?: any) => {
    if (typeof state?.activeTooltipIndex === 'number') {
      setSelectedIndex(state.activeTooltipIndex);
    }
  }, []);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        <p className="mt-6 text-sm text-slate-500">Belum ada data untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {highlightPoint ? (
          <div className="text-right">
            <p className="text-xs font-medium text-indigo-500">{highlightPoint.label}</p>
            <p className="text-xl font-semibold text-slate-900">{formatNumber(highlightPoint.value)}</p>
          </div>
        ) : null}
      </div>
      <div className="mt-6 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleChartClick}
            margin={{ top: 5, right: 5, left: 15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 8 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis hide domain={[0, (max: number) => Math.max(Number.isFinite(max) ? max : 0, 1) * 1.2]} />
            <Tooltip
              cursor={{ stroke: color, strokeDasharray: '4 4' }}
              wrapperStyle={{ outline: 'none' }}
              content={(props) => <SparklineTooltip {...props} color={color} />}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {footer ? <p className="mt-4 text-xs text-slate-500">{footer}</p> : null}
      {selectedPoint ? (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          <p className="text-sm font-semibold text-indigo-600">{selectedPoint.label}</p>
          <p className="text-xs text-indigo-500">
            Official payments:{' '}
            <span className="font-medium text-indigo-600">{formatNumber(selectedPoint.value)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface SparklineTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: ValueType }>;
  label?: NameType;
  color: string;
}

function SparklineTooltip({ active, payload, label, color }: SparklineTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2 font-medium text-slate-700">
        <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label ?? 'Official payments'}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-slate-900">
        Official payments: {formatNumber(value)}
      </div>
    </div>
  );
}

interface GradeGrowthChartProps {
  data: GradeYearData[];
}

function GradeGrowthChart({ data }: GradeGrowthChartProps) {
  const gradeColors = {
    PG: '#9CA3AF',
    TK: '#06B6D4',
    SD: '#3B82F6',
    SMP: '#1E40AF',
    SMA: '#1E3A8A',
  };

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((yearData) => ({
      year: yearData.year,
      isProjection: yearData.isProjection,
      PG: Number(yearData.PG ?? 0),
      TK: Number(yearData.TK ?? 0),
      SD: Number(yearData.SD ?? 0),
      SMP: Number(yearData.SMP ?? 0),
      SMA: Number(yearData.SMA ?? 0),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Belum ada data pertumbuhan grade untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Last 3 Years Growth and Next Year Projection of PSB
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Student enrollment trends across grade levels with AI-based projection
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-4 text-xs">
        {Object.entries(gradeColors).map(([grade, color]) => (
          <div key={grade} className="flex items-center gap-2">
            <span
              className="inline-flex h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-medium text-slate-700">{grade}</span>
          </div>
        ))}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const yearData = chartData.find((d) => d.year === label);
                const isProj = yearData?.isProjection;

                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-xs font-semibold text-slate-900">
                      {label}
                      {isProj && (
                        <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Projection
                        </span>
                      )}
                    </p>
                    <div className="space-y-1">
                      {payload.map((entry) => (
                        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-medium text-slate-700">{entry.dataKey}</span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {formatNumber(Number(entry.value ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="PG" fill={gradeColors.PG} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-pg-${index}`}
                  opacity={entry.isProjection ? 0.6 : 1}
                />
              ))}
              <LabelList
                dataKey="PG"
                position="top"
                style={{ fontSize: '11px', fontWeight: '600', fill: '#475569' }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="TK" fill={gradeColors.TK} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-tk-${index}`}
                  opacity={entry.isProjection ? 0.6 : 1}
                />
              ))}
              <LabelList
                dataKey="TK"
                position="top"
                style={{ fontSize: '11px', fontWeight: '600', fill: '#475569' }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="SD" fill={gradeColors.SD} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-sd-${index}`}
                  opacity={entry.isProjection ? 0.6 : 1}
                />
              ))}
              <LabelList
                dataKey="SD"
                position="top"
                style={{ fontSize: '11px', fontWeight: '600', fill: '#475569' }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="SMP" fill={gradeColors.SMP} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-smp-${index}`}
                  opacity={entry.isProjection ? 0.6 : 1}
                />
              ))}
              <LabelList
                dataKey="SMP"
                position="top"
                style={{ fontSize: '11px', fontWeight: '600', fill: '#475569' }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
            <Bar dataKey="SMA" fill={gradeColors.SMA} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-sma-${index}`}
                  opacity={entry.isProjection ? 0.6 : 1}
                />
              ))}
              <LabelList
                dataKey="SMA"
                position="top"
                style={{ fontSize: '11px', fontWeight: '600', fill: '#475569' }}
                formatter={(value: number) => (value > 0 ? value : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
