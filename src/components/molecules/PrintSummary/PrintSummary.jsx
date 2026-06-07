function getCard(report, title) {
  return report.cards.find((card) => card.title === title);
}

export default function PrintSummary({
  report,
  type,
  includeTimestamp = true,
}) {
  const printedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (type === "food") {
    const revenue = getCard(report, "F&B Revenue")?.value;
    const covers = getCard(report, "Total Covers")?.value;
    const avgCheque = getCard(report, "Avg. Cheque")?.value;
    const bestChannel = getCard(report, "Best Channel");
    const peakPeriod = getCard(report, "Peak Day") || getCard(report, "Peak Interval");

    return (
      <section className="print-summary">
        <h2>Executive Summary</h2>
        {includeTimestamp ? (
          <span className="print-summary-meta">Exported {printedAt}</span>
        ) : null}
        <p>
          This Food & Beverage report summarizes uploaded channel revenue,
          covers, average cheque, channel contribution, and day-wise revenue
          movement. Total F&B revenue is {revenue}, generated from {covers}{" "}
          covers at an average cheque of {avgCheque}. The strongest channel is{" "}
          {bestChannel?.value} with {bestChannel?.growth}, while the peak sales
          period is {peakPeriod?.value} at {peakPeriod?.growth}.
        </p>
      </section>
    );
  }

  const topDepartment = report.cards[0];

  return (
    <section className="print-summary">
      <h2>Executive Summary</h2>
      {includeTimestamp ? (
        <span className="print-summary-meta">Exported {printedAt}</span>
      ) : null}
      <p>
        This ancillary revenue report summarizes department performance and
        banquet activity from the uploaded file. The highest contributing
        revenue centre is {topDepartment?.title} at {topDepartment?.value}.
        The chart below compares revenue across departments, followed by the
        detailed event table where available.
      </p>
    </section>
  );
}
