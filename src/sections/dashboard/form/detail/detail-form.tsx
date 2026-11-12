import React from 'react';
// interfaces
import { FinalFormInterface } from '/src/interfaces/final-form';
//
import { SummaryQuestionDistributionInterface } from '../view/form-detail-view';

// ----------------------------------------------------------------------

interface DetailFormProps {
  currentForm: FinalFormInterface;
  summary: SummaryQuestionDistributionInterface[];
}

// ----------------------------------------------------------------------

const DetailForm: React.FC<DetailFormProps> = ({ currentForm, summary }) => {
  return (
    <div className="mt-6 space-y-4 font-poppins">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-3">Summary Formulir</p>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">{currentForm.title}</h1>

            <p className="max-w-3xl text-sm leading-6 text-slate-500 sm:text-[15px]">Ringkasan distribusi hasil penilaian berdasarkan kriteria dan pertanyaan.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500">Kriteria</p>
              <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{summary.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500">Pertanyaan</p>
              <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{summary.reduce((acc, item) => acc + item.questions.length, 0)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-xs font-medium text-slate-500">Total Respon</p>
              <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                {summary.reduce((acc, criteria) => acc + criteria.questions.reduce((qAcc, question) => qAcc + question.totalAnswer, 0), 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-primary-2/20 bg-primary-2/10 p-3 sm:p-4">
              <p className="text-xs font-medium text-primary-1">Warna utama</p>
              <p className="mt-1 text-lg font-bold text-primary-1 sm:text-xl">Primary</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {summary.map((criteria) => (
          <section key={criteria.criteriaId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-3">Kriteria</p>
                  <h2 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{criteria.criteriaName}</h2>
                </div>

                <div className="inline-flex w-fit items-center rounded-full border border-primary-2/20 bg-primary-2/10 px-3 py-1 text-xs font-semibold text-primary-1 sm:text-sm">
                  {criteria.questions.length} Pertanyaan
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {criteria.questions.map((question) => {
                const total = question.totalAnswer;

                return (
                  <article key={question.questionId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-col gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pertanyaan</p>

                        <h3 className="text-sm font-semibold leading-6 text-slate-900 sm:text-base lg:text-[17px]">{question.questionName}</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-2/10 px-3 py-1 text-xs font-semibold text-primary-1">Total jawaban: {total}</span>

                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">Distribusi A / B / C / D</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
                        {Object.entries(question.distribution).map(([label, value]) => {
                          const percent = total > 0 ? (value / total) * 100 : 0;
                          if (percent === 0) return null;

                          const color = label.startsWith('A.') ? 'bg-primary-3' : label.startsWith('B.') ? 'bg-primary-2' : label.startsWith('C.') ? 'bg-amber-500' : 'bg-rose-500';

                          return <div key={label} className={`${color} h-full`} style={{ width: `${percent}%` }} title={`${label}: ${value}`} />;
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Object.entries(question.distribution).map(([label, value]) => {
                          const percent = total > 0 ? Math.round((value / total) * 100) : 0;

                          const badgeColor = label.startsWith('A.')
                            ? 'bg-primary-3 text-white'
                            : label.startsWith('B.')
                              ? 'bg-primary-2 text-white'
                              : label.startsWith('C.')
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-500 text-white';

                          return (
                            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColor}`}>{label}</span>

                                <span className="text-sm font-bold text-slate-900">{value}</span>
                              </div>

                              <p className="mt-2 text-xs text-slate-500">{percent}% dari total jawaban</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default DetailForm;
