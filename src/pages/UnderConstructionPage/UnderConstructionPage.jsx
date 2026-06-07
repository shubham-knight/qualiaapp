import { HardHat } from "lucide-react";

export default function UnderConstructionPage({ title, punchline, detail }) {
  return (
    <div className="construction-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{detail}</p>
        </div>
      </div>

      <section className="construction-panel">
        <div className="construction-icon">
          <HardHat size={26} strokeWidth={2.1} />
        </div>
        <h2>{punchline}</h2>
        <p>
          This module is being prepared to match the upload-driven dashboard flow.
          Reports, charts, and performance views will land here next.
        </p>
      </section>
    </div>
  );
}
