export default function EventTable({ events }) {
  return (
    <>
      <h2 className="card-title">Banquet Events — May</h2>

      <table className="events-table">
        <thead>
          <tr>
            <th>EVENT</th>
            <th>PAX</th>
            <th>REVENUE</th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.event}>
              <td>{event.event}</td>
              <td>{event.pax}</td>
              <td className="revenue">{event.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
