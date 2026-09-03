import React, { useState, useMemo } from 'react';
import { Cheque, Fournisseur, Budget } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  BarChart3,
  Layers
} from 'lucide-react';

interface StatistiquesViewProps {
  cheques: Cheque[];
  fournisseurs: Fournisseur[];
  budget: Budget | null;
}

export const StatistiquesView: React.FC<StatistiquesViewProps> = ({
  cheques,
  fournisseurs,
  budget
}) => {
  const [horizon, setHorizon] = useState<'3months' | '6months' | '12months'>('6months');
  const [granularity, setGranularity] = useState<'month' | 'week'>('month');
  const [chartType, setChartType] = useState<'composed' | 'cumulative'>('composed');

  // Overall totals
  const totalAmount = cheques.reduce((s, c) => s + c.montant, 0);
  const paidAmount = cheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
  const pendingAmount = cheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
  const unpaidAmount = cheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);

  const paidRatio = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const pendingRatio = totalAmount > 0 ? Math.round((pendingAmount / totalAmount) * 100) : 0;
  const unpaidRatio = totalAmount > 0 ? Math.round((unpaidAmount / totalAmount) * 100) : 0;

  // Monthly budget limit
  const budgetPlafond = budget?.maxAmount || 0;

  // Calculate upcoming due dates metrics (7 days, 30 days, 60 days)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming7Days = useMemo(() => {
    const end7 = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    return cheques.filter(c => {
      if (c.statut !== 'en_attente') return false;
      const d = new Date(c.datePaiement);
      return !isNaN(d.getTime()) && d >= startOfToday && d <= end7;
    });
  }, [cheques, startOfToday]);

  const upcoming30Days = useMemo(() => {
    const end30 = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
    return cheques.filter(c => {
      if (c.statut !== 'en_attente') return false;
      const d = new Date(c.datePaiement);
      return !isNaN(d.getTime()) && d >= startOfToday && d <= end30;
    });
  }, [cheques, startOfToday]);

  const amount7Days = upcoming7Days.reduce((s, c) => s + c.montant, 0);
  const amount30Days = upcoming30Days.reduce((s, c) => s + c.montant, 0);

  // Helper to format months in French
  const getMonthName = (monthIndex: number, year: number, short = false) => {
    const date = new Date(year, monthIndex, 1);
    return date.toLocaleDateString('fr-FR', {
      month: short ? 'short' : 'long',
      year: short ? '2-digit' : 'numeric'
    });
  };

  // Helper to format ISO week string
  const getWeekNumber = (d: Date) => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  };

  // 1. Build Monthly Forecast Data based on horizon
  const monthlyForecastData = useMemo(() => {
    const monthsCount = horizon === '3months' ? 3 : horizon === '6months' ? 6 : 12;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const data: {
      key: string;
      label: string;
      shortLabel: string;
      aDecaisser: number;
      dejaPaye: number;
      impaye: number;
      totalPrevu: number;
      cumulPrevu: number;
      plafond: number;
      tauxBudget: number;
      depassement: number;
      nbCheques: number;
      nbEnAttente: number;
      isCurrentMonth: boolean;
    }[] = [];

    let runningCumul = 0;

    for (let i = 0; i < monthsCount; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const y = date.getFullYear();
      const m = date.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      // Filter cheques for this month
      const monthCheques = cheques.filter(c => {
        if (!c.datePaiement) return false;
        const cd = new Date(c.datePaiement);
        return !isNaN(cd.getTime()) && cd.getFullYear() === y && cd.getMonth() === m;
      });

      const aDecaisser = monthCheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
      const dejaPaye = monthCheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
      const impaye = monthCheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);
      const totalPrevu = aDecaisser + dejaPaye + impaye;

      runningCumul += aDecaisser;

      const tauxBudget = budgetPlafond > 0 ? Math.round((totalPrevu / budgetPlafond) * 100) : 0;
      const depassement = budgetPlafond > 0 ? Math.max(0, totalPrevu - budgetPlafond) : 0;

      data.push({
        key,
        label: getMonthName(m, y, false),
        shortLabel: getMonthName(m, y, true),
        aDecaisser,
        dejaPaye,
        impaye,
        totalPrevu,
        cumulPrevu: runningCumul,
        plafond: budgetPlafond,
        tauxBudget,
        depassement,
        nbCheques: monthCheques.length,
        nbEnAttente: monthCheques.filter(c => c.statut === 'en_attente').length,
        isCurrentMonth: i === 0
      });
    }

    return data;
  }, [cheques, horizon, budgetPlafond, now]);

  // 2. Build Weekly Forecast Data (next 8 weeks)
  const weeklyForecastData = useMemo(() => {
    const weeksCount = 8;
    const weeklyPlafond = Math.round(budgetPlafond / 4);

    const data: {
      key: string;
      label: string;
      shortLabel: string;
      aDecaisser: number;
      dejaPaye: number;
      impaye: number;
      totalPrevu: number;
      cumulPrevu: number;
      plafond: number;
      tauxBudget: number;
      depassement: number;
      nbCheques: number;
      nbEnAttente: number;
      isCurrentMonth: boolean;
    }[] = [];

    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);

    let runningCumul = 0;

    for (let i = 0; i < weeksCount; i++) {
      const wStart = new Date(startOfWeek.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(wStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000);
      const weekNum = getWeekNumber(wStart);

      const weekCheques = cheques.filter(c => {
        if (!c.datePaiement) return false;
        const cd = new Date(c.datePaiement);
        return !isNaN(cd.getTime()) && cd >= wStart && cd <= wEnd;
      });

      const aDecaisser = weekCheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
      const dejaPaye = weekCheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
      const impaye = weekCheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);
      const totalPrevu = aDecaisser + dejaPaye + impaye;

      runningCumul += aDecaisser;

      const tauxBudget = weeklyPlafond > 0 ? Math.round((totalPrevu / weeklyPlafond) * 100) : 0;
      const depassement = weeklyPlafond > 0 ? Math.max(0, totalPrevu - weeklyPlafond) : 0;
      const weekLabel = `Sem. ${weekNum} (${wStart.getDate()} ${wStart.toLocaleDateString('fr-FR', { month: 'short' })})`;

      data.push({
        key: `S${weekNum}-${wStart.getFullYear()}`,
        label: weekLabel,
        shortLabel: `S${weekNum}`,
        aDecaisser,
        dejaPaye,
        impaye,
        totalPrevu,
        cumulPrevu: runningCumul,
        plafond: weeklyPlafond,
        tauxBudget,
        depassement,
        nbCheques: weekCheques.length,
        nbEnAttente: weekCheques.filter(c => c.statut === 'en_attente').length,
        isCurrentMonth: i === 0
      });
    }

    return data;
  }, [cheques, budgetPlafond, startOfToday]);

  const activeForecastData = granularity === 'month' ? monthlyForecastData : weeklyForecastData;

  // Identify months with budget alert (exceeding budget limit)
  const overBudgetMonths = useMemo(() => {
    if (budgetPlafond <= 0) return [];
    return monthlyForecastData.filter(m => m.totalPrevu > budgetPlafond);
  }, [monthlyForecastData, budgetPlafond]);

  // Group by supplier for top spending
  const supplierStats = useMemo(() => {
    return fournisseurs
      .map(f => {
        const list = cheques.filter(c => c.fournisseurId === f.id);
        const sum = list.reduce((acc, c) => acc + c.montant, 0);
        const pendingSum = list.filter(c => c.statut === 'en_attente').reduce((acc, c) => acc + c.montant, 0);
        return {
          id: f.id,
          name: f.nom,
          count: list.length,
          amount: sum,
          pendingAmount: pendingSum,
          ratio: totalAmount > 0 ? Math.round((sum / totalAmount) * 100) : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [fournisseurs, cheques, totalAmount]);

  // Custom Tooltip for Recharts
  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    const isOver = budgetPlafond > 0 && dataItem.totalPrevu > (granularity === 'month' ? budgetPlafond : budgetPlafond / 4);

    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-xl text-xs max-w-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-900 text-sm">{dataItem.label}</span>
          <span className="text-[11px] font-semibold text-slate-500">
            {dataItem.nbCheques} chèque(s)
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-amber-700">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              À décaisser (En attente) :
            </span>
            <span className="font-bold">{dataItem.aDecaisser.toLocaleString('fr-FR')} DH</span>
          </div>

          <div className="flex items-center justify-between text-emerald-700">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Déjà réglé :
            </span>
            <span className="font-bold">{dataItem.dejaPaye.toLocaleString('fr-FR')} DH</span>
          </div>

          {dataItem.impaye > 0 && (
            <div className="flex items-center justify-between text-rose-700">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Impayés :
              </span>
              <span className="font-bold">{dataItem.impaye.toLocaleString('fr-FR')} DH</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-slate-900">
            <span>Engagement Total :</span>
            <span className="text-blue-700">{dataItem.totalPrevu.toLocaleString('fr-FR')} DH</span>
          </div>

          {chartType === 'cumulative' && (
            <div className="flex items-center justify-between text-indigo-700 font-semibold pt-1">
              <span>Décaissements cumulés :</span>
              <span>{dataItem.cumulPrevu.toLocaleString('fr-FR')} DH</span>
            </div>
          )}

          {budgetPlafond > 0 && granularity === 'month' && (
            <div className="pt-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-500">
                <span>Plafond mensuel :</span>
                <span>{budgetPlafond.toLocaleString('fr-FR')} DH</span>
              </div>
              <div className="mt-1">
                {isOver ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                    ⚠️ Dépassement prévisionnel: +{dataItem.depassement.toLocaleString('fr-FR')} DH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                    ✓ Dans la limite ({dataItem.tauxBudget}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Cartes KPI de Prévision d'Échéances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Chèques à Décaisser */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Chèques à Décaisser
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {pendingAmount.toLocaleString('fr-FR')} <span className="text-xs font-semibold">DH</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {cheques.filter(c => c.statut === 'en_attente').length} chèques en attente d'échéance
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Décaissements Urgents (7 jours) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Échéances à 7 Jours
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {amount7Days.toLocaleString('fr-FR')} <span className="text-xs font-semibold">DH</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {upcoming7Days.length} chèque(s) à provisionner
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Décaissements à 30 jours */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Échéances à 30 Jours
            </span>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {amount30Days.toLocaleString('fr-FR')} <span className="text-xs font-semibold">DH</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {upcoming30Days.length} chèque(s) sous 1 mois
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Plafond Budgétaire Mensuel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Plafond Budgétaire
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {budgetPlafond > 0 ? (
                <>
                  {budgetPlafond.toLocaleString('fr-FR')} <span className="text-xs font-semibold">DH/m</span>
                </>
              ) : (
                <span className="text-base text-slate-400 font-medium">Non défini</span>
              )}
            </div>
            <div className="text-xs mt-0.5">
              {overBudgetMonths.length > 0 ? (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {overBudgetMonths.length} mois en dépassement
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Prévisions conformes
                </span>
              )}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            overBudgetMonths.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Alerte Dépassement Budgétaire Anticipé */}
      {overBudgetMonths.length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4.5 flex items-start gap-3.5 text-xs text-rose-900 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="grow">
            <span className="font-bold text-sm block text-rose-950">
              Alerte de Trésorerie : Dépassement Budgétaire Anticipé
            </span>
            <p className="mt-1 text-rose-800 leading-relaxed">
              Les échéances programmées pour les mois suivants dépassent le plafond mensuel autorisé (
              <strong>{budgetPlafond.toLocaleString('fr-FR')} DH</strong>) :
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {overBudgetMonths.map(m => (
                <span
                  key={m.key}
                  className="bg-white px-3 py-1 rounded-lg border border-rose-200 font-semibold text-rose-800 flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{m.label} :</span>
                  <strong>{m.totalPrevu.toLocaleString('fr-FR')} DH</strong>
                  <span className="text-rose-600 text-[11px]">
                    (+{m.depassement.toLocaleString('fr-FR')} DH)
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Graphique Recharts de Prévision Budgétaire */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Prévision Budgétaire & Calendrier des Décaissements
              </h2>
              <p className="text-xs text-slate-500">
                Projection des chèques à honorer dans le temps par rapport au plafond mensuel
              </p>
            </div>
          </div>

          {/* Filters & Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Granularity Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGranularity('month')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  granularity === 'month'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Par Mois
              </button>
              <button
                type="button"
                onClick={() => setGranularity('week')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  granularity === 'week'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Par Semaine
              </button>
            </div>

            {/* Horizon Filter (for months) */}
            {granularity === 'month' && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHorizon('3months')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    horizon === '3months'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3 Mois
                </button>
                <button
                  type="button"
                  onClick={() => setHorizon('6months')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    horizon === '6months'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  6 Mois
                </button>
                <button
                  type="button"
                  onClick={() => setHorizon('12months')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    horizon === '12months'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  12 Mois
                </button>
              </div>
            )}

            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartType('composed')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  chartType === 'composed'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Histogramme empilé par période"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Barres</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('cumulative')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  chartType === 'cumulative'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Flux de trésorerie cumulé"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cumulé</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend Information */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              À décaisser (Chèques en attente d'échéance)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              Déjà réglé (Chèques payés)
            </span>
            {budgetPlafond > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-rose-600">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
                Plafond Budgétaire ({budgetPlafond.toLocaleString('fr-FR')} DH)
              </span>
            )}
          </div>

          <span className="text-[11px] text-slate-500">
            Montants exprimés en Dirhams marocains (DH)
          </span>
        </div>

        {/* Recharts Canvas */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'composed' ? (
              <ComposedChart
                data={activeForecastData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  dy={8}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                />
                <Tooltip content={<CustomForecastTooltip />} />

                {/* Monthly Budget ceiling reference line */}
                {budgetPlafond > 0 && (
                  <ReferenceLine
                    y={granularity === 'month' ? budgetPlafond : budgetPlafond / 4}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Plafond: ${(granularity === 'month' ? budgetPlafond : Math.round(budgetPlafond / 4)).toLocaleString('fr-FR')} DH`,
                      position: 'top',
                      fill: '#be123c',
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />
                )}

                {/* Stacked bars: Déjà Payé + À Décaisser + Impayé */}
                <Bar
                  dataKey="dejaPaye"
                  name="Déjà payé"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  barSize={32}
                />
                <Bar
                  dataKey="aDecaisser"
                  name="À décaisser"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
                <Bar
                  dataKey="impaye"
                  name="Impayé"
                  stackId="a"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />

                {/* Line of total projected commitment */}
                <Line
                  type="monotone"
                  dataKey="totalPrevu"
                  name="Engagement Total"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#1d4ed8' }}
                />
              </ComposedChart>
            ) : (
              <AreaChart
                data={activeForecastData}
                margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="colorCumul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPrevu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  dy={8}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                />
                <Tooltip content={<CustomForecastTooltip />} />

                <Area
                  type="monotone"
                  dataKey="cumulPrevu"
                  name="Décaissements Cumulés"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCumul)"
                />
                <Area
                  type="monotone"
                  dataKey="aDecaisser"
                  name="À Décaisser par Période"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrevu)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Forecast Table: Synthèse Périodique */}
        <div className="overflow-x-auto border-t border-slate-100 pt-5">
          <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>Détail du Calendrier d'Échéances Prévisionnelles :</span>
            <span className="text-slate-400 font-normal">
              Total horizon : {activeForecastData.reduce((s, d) => s + d.aDecaisser, 0).toLocaleString('fr-FR')} DH à décaisser
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3 text-right">À Décaisser</th>
                <th className="px-4 py-3 text-right">Déjà Réglé</th>
                <th className="px-4 py-3 text-right">Total Prévu</th>
                {budgetPlafond > 0 && <th className="px-4 py-3 text-right">Plafond</th>}
                <th className="px-4 py-3">Charge Budgétaire</th>
                <th className="px-4 py-3 text-center">Chèques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeForecastData.map((d) => {
                const isOver = budgetPlafond > 0 && d.totalPrevu > (granularity === 'month' ? budgetPlafond : budgetPlafond / 4);
                const progressRatio = budgetPlafond > 0
                  ? Math.min(Math.round((d.totalPrevu / (granularity === 'month' ? budgetPlafond : budgetPlafond / 4)) * 100), 100)
                  : 0;

                return (
                  <tr key={d.key} className={`hover:bg-slate-50/80 transition ${d.isCurrentMonth ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <span>{d.label}</span>
                      {d.isCurrentMonth && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">
                      {d.aDecaisser > 0 ? `${d.aDecaisser.toLocaleString('fr-FR')} DH` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                      {d.dejaPaye > 0 ? `${d.dejaPaye.toLocaleString('fr-FR')} DH` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {d.totalPrevu.toLocaleString('fr-FR')} DH
                    </td>
                    {budgetPlafond > 0 && (
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">
                        {(granularity === 'month' ? budgetPlafond : Math.round(budgetPlafond / 4)).toLocaleString('fr-FR')} DH
                      </td>
                    )}
                    <td className="px-4 py-3 min-w-[140px]">
                      {budgetPlafond > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className={isOver ? 'text-rose-600' : 'text-slate-600'}>
                              {d.tauxBudget}%
                            </span>
                            {isOver && (
                              <span className="text-rose-600 font-bold">
                                +{d.depassement.toLocaleString('fr-FR')} DH
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOver
                                  ? 'bg-rose-500'
                                  : progressRatio > 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progressRatio}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {d.nbCheques} {d.nbEnAttente > 0 ? `(${d.nbEnAttente} à venir)` : ''}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Visual Status Breakdown & Fournisseurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Répartition Globale par Statut</h2>
            </div>

            {/* Stacked ratio bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-4">
              <div style={{ width: `${paidRatio}%` }} className="bg-emerald-500 h-full" title={`Payé: ${paidRatio}%`} />
              <div style={{ width: `${pendingRatio}%` }} className="bg-amber-500 h-full" title={`En attente: ${pendingRatio}%`} />
              <div style={{ width: `${unpaidRatio}%` }} className="bg-rose-500 h-full" title={`Impayé: ${unpaidRatio}%`} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs mb-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <div className="flex items-center justify-between font-semibold text-emerald-800 mb-1">
                  <span>Payé</span>
                  <span>{paidRatio}%</span>
                </div>
                <div className="text-base font-bold text-emerald-700">
                  {paidAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal">DH</span>
                </div>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {cheques.filter(c => c.statut === 'paye').length} chèque(s)
                </span>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                <div className="flex items-center justify-between font-semibold text-amber-800 mb-1">
                  <span>En Attente</span>
                  <span>{pendingRatio}%</span>
                </div>
                <div className="text-base font-bold text-amber-700">
                  {pendingAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal">DH</span>
                </div>
                <span className="text-[10px] text-amber-600 block mt-0.5">
                  {cheques.filter(c => c.statut === 'en_attente').length} chèque(s)
                </span>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                <div className="flex items-center justify-between font-semibold text-rose-800 mb-1">
                  <span>Impayé</span>
                  <span>{unpaidRatio}%</span>
                </div>
                <div className="text-base font-bold text-rose-700">
                  {unpaidAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal">DH</span>
                </div>
                <span className="text-[10px] text-rose-600 block mt-0.5">
                  {cheques.filter(c => c.statut === 'impaye').length} chèque(s)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-200/60">
            Total des engagements enregistrés : <strong>{totalAmount.toLocaleString('fr-FR')} DH</strong> sur <strong>{cheques.length} chèques</strong>.
          </div>
        </div>

        {/* Breakdown by Supplier */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Volume des Dépenses par Fournisseur</h2>
            </div>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {supplierStats.slice(0, 6).map((s, idx) => (
                <div key={s.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[170px]">{s.name}</span>
                      <span className="text-slate-400 font-normal text-[11px]">({s.count})</span>
                    </div>
                    <div className="font-bold text-slate-900 text-right">
                      {s.amount.toLocaleString('fr-FR')} DH
                      {s.pendingAmount > 0 && (
                        <span className="text-amber-600 font-normal text-[10px] block">
                          dont {s.pendingAmount.toLocaleString('fr-FR')} DH à venir
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(s.ratio, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 text-right">
            Top {Math.min(6, supplierStats.length)} partenaires commerciaux
          </div>
        </div>
      </div>
    </div>
  );
};
