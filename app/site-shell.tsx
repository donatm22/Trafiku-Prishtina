import { AccountMenu, MobileAccountLink } from "./account-menu";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="Trafiku Prishtina — Ballina">
          <span className="brand-mark">T</span>
          <span>Trafiku <span className="brand-dot">Prishtina</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Navigimi kryesor">
          <a href="#harta">Harta</a>
          <a href="#raportimet">Raportimet</a>
          <a href="#si-funksionon">Si funksionon</a>
        </nav>
        <div className="header-actions">
          <a className="prishtina-link" href="https://prishtina.online">Prishtina.online ↗</a>
          <a className="button button-primary button-small" href="#raporto">+ Raporto</a>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" id="rreth">
      <div className="footer-inner">
        <div>
          <a className="brand footer-brand" href="/">
            <span className="brand-mark">T</span>
            Trafiku <span className="brand-dot">Prishtina</span>
          </a>
          <p>Raporto. Informo. Lëviz më mirë.</p>
        </div>
        <div className="footer-links">
          <a href="#si-funksionon">Si funksionon</a>
          <a href="#siguria">Siguria</a>
          <a href="https://prishtina.online">Prishtina.online</a>
        </div>
        <p className="copyright">© 2026 Trafiku Prishtina · Platformë e komunitetit</p>
      </div>
    </footer>
  );
}

export function MobileNavigation() {
  return (
    <nav className="mobile-nav" aria-label="Navigimi për telefon">
      <a href="#harta"><span aria-hidden="true">⌖</span>Harta</a>
      <a href="#raportimet"><span aria-hidden="true">≡</span>Raportimet</a>
      <a className="mobile-create" href="#raporto"><span aria-hidden="true">+</span>Raporto</a>
      <a href="#njoftimet"><span aria-hidden="true">◌</span>Njoftimet</a>
      <MobileAccountLink />
    </nav>
  );
}
