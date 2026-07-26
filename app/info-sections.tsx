import { AlertTriangle, CheckCircle2, Construction, MapPinned, MessageSquarePlus, Route, ShieldCheck, TrafficCone } from "lucide-react";

const incidentTypes = [
  { icon: TrafficCone, title: "Kolona", text: "Ngadalësime dhe pritje të gjata në rrugët e qytetit.", tone: "red" },
  { icon: AlertTriangle, title: "Aksidente", text: "Ngjarje që ndikojnë sigurinë dhe rrjedhën e trafikut.", tone: "ink" },
  { icon: Construction, title: "Rrugë të mbyllura", text: "Punime ose bllokime që kërkojnë rrugë alternative.", tone: "brown" },
  { icon: Route, title: "Rreziqe", text: "Pengesa, dëmtime dhe kushte që duhen kaluar me kujdes.", tone: "amber" },
];

export function InfoSections() {
  return (
    <>
      <section className="incident-types-section" aria-labelledby="types-title">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <span>Katër raportime të qarta</span>
              <h2 id="types-title">Çfarë mund të raportosh</h2>
            </div>
          </div>
          <div className="incident-type-grid">
            {incidentTypes.map(({ icon: Icon, title, text, tone }) => (
              <article key={title}>
                <span className={`type-icon type-icon-${tone}`}><Icon size={21} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how-section" id="si-funksionon" aria-labelledby="how-title">
        <div className="page-shell how-layout">
          <div className="how-copy">
            <span className="eyebrow"><b />Nga qyteti, për qytetin</span>
            <h2 id="how-title">Një hartë që bëhet më e dobishme me çdo raportim.</h2>
            <p>Raportimet shfaqen menjëherë dhe komuniteti mund të konfirmojë nëse ngjarja vazhdon.</p>
          </div>
          <ol className="how-steps">
            <li><span>01</span><MapPinned size={22} /><div><strong>Zgjidhe pikën</strong><p>Përdor vendndodhjen ose prek hartën.</p></div></li>
            <li><span>02</span><MessageSquarePlus size={22} /><div><strong>Përshkruaje shkurt</strong><p>Zgjidh llojin dhe ndikimin në trafik.</p></div></li>
            <li><span>03</span><CheckCircle2 size={22} /><div><strong>Komuniteti konfirmon</strong><p>Raportimet e dobishme qëndrojnë aktuale.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="safety-strip" id="siguria">
        <div className="page-shell">
          <ShieldCheck size={27} aria-hidden="true" />
          <div><strong>Siguria vjen e para.</strong><p>Raporto vetëm pasi të kesh ndaluar në një vend të sigurt. Për emergjenca, kontakto shërbimet përkatëse.</p></div>
        </div>
      </section>
    </>
  );
}
