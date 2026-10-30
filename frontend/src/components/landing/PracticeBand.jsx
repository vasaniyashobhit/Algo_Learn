/** The practice-only commitment, on chalk so it cannot be missed. */
export const PracticeBand = () => (
  <section className="mt-[4.5rem] bg-chalk py-8 text-chalk-ink" aria-labelledby="practice-title">
    <div className="wrap">
      <h2 id="practice-title">Practice and upsolving only</h2>
      <p className="m-0 text-[1.08rem]">
        Not for live rated contests or placement tests. Using it there breaks their rules, and the point is to get
        better, not to get through.
      </p>
    </div>
  </section>
);
