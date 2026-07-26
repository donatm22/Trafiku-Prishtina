export default function Home() {
  return (
    <main>
      <section className="traffic-intro">
        <div className="page-shell intro-inner">
          <div>
            <span className="eyebrow"><b />Trafiku në kohë reale</span>
            <h1>Shihe trafikun.<br /><em>Raporto çfarë po ndodh.</em></h1>
            <p>Informacion nga qytetarët për lëvizje më të mençur nëpër Prishtinë.</p>
          </div>
          <a className="button button-primary" href="#raporto">+ Raporto ngjarje</a>
        </div>
      </section>
      <section className="page-shell map-placeholder" aria-label="Harta e trafikut po përgatitet">
        <span className="brand-mark">T</span>
        <strong>Harta e trafikut</strong>
        <p>Kolona, aksidente, rrugë të mbyllura dhe rreziqe.</p>
      </section>
    </main>
  );
}
