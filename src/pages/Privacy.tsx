import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volleyball } from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Privacy() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <Volleyball className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Top Volley Manager</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/landing">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          {lang === 'es' && <PrivacyES />}
          {lang === 'en' && <PrivacyEN />}
          {lang === 'it' && <PrivacyIT />}
          {!['es', 'en', 'it'].includes(lang) && <PrivacyES />}
        </article>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-muted/30 mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Top Volley Manager SL. {t('landing.footer.rights')}
        </div>
      </footer>
    </div>
  );
}

function PrivacyES() {
  return (
    <>
      <h1>Política de Privacidad</h1>
      <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <h2>1. Información del Responsable del Tratamiento</h2>
      <p>
        <strong>Razón Social:</strong> Top Volley Manager SL<br />
        <strong>Domicilio Social:</strong> Plaza Pontevedra 10, 2B, 15003 A Coruña, España<br />
        <strong>Email de contacto:</strong> info@topvolleymanager.com
      </p>

      <h2>2. Datos Personales que Recopilamos</h2>
      <p>Recopilamos los siguientes tipos de datos personales:</p>
      <ul>
        <li><strong>Datos de registro:</strong> nombre, dirección de correo electrónico y contraseña cifrada.</li>
        <li><strong>Datos de jugadoras:</strong> nombre, apellidos, año de nacimiento, altura, número de teléfono, fotografía y datos de rendimiento deportivo.</li>
        <li><strong>Datos de uso:</strong> información sobre cómo utiliza nuestra aplicación, incluyendo registros de acceso y preferencias.</li>
        <li><strong>Datos de suscripción:</strong> información de facturación procesada a través de Stripe (no almacenamos datos de tarjetas de crédito).</li>
      </ul>

      <h2>3. Base Legal del Tratamiento</h2>
      <p>El tratamiento de sus datos personales se basa en:</p>
      <ul>
        <li><strong>Ejecución contractual:</strong> para proporcionar los servicios contratados.</li>
        <li><strong>Consentimiento:</strong> cuando nos lo otorga expresamente.</li>
        <li><strong>Interés legítimo:</strong> para mejorar nuestros servicios y comunicarnos con usted.</li>
        <li><strong>Obligación legal:</strong> cuando sea requerido por la legislación aplicable.</li>
      </ul>

      <h2>4. Finalidad del Tratamiento</h2>
      <p>Utilizamos sus datos personales exclusivamente para:</p>
      <ul>
        <li>Gestionar su cuenta de usuario y proporcionar acceso a la aplicación.</li>
        <li>Facilitar la gestión de equipos deportivos, jugadoras y eventos.</li>
        <li>Procesar pagos de suscripciones a través de proveedores de pago seguros.</li>
        <li>Enviar comunicaciones relacionadas con el servicio (actualizaciones, cambios en términos, etc.).</li>
        <li>Mejorar la funcionalidad y experiencia de usuario de la aplicación.</li>
      </ul>
      <p className="font-semibold">
        Nos comprometemos a NO utilizar sus datos personales para fines comerciales externos a los propósitos de esta aplicación web. No vendemos, alquilamos ni compartimos sus datos con terceros para fines de marketing.
      </p>

      <h2>5. Destinatarios de los Datos</h2>
      <p>Sus datos pueden ser compartidos con:</p>
      <ul>
        <li><strong>Proveedores de servicios:</strong> empresas que nos ayudan a operar la plataforma (hosting, procesamiento de pagos, envío de emails).</li>
        <li><strong>Autoridades competentes:</strong> cuando sea legalmente requerido.</li>
      </ul>
      <p>Todos nuestros proveedores están ubicados en la Unión Europea o cuentan con las garantías adecuadas para transferencias internacionales.</p>

      <h2>6. Transferencias Internacionales</h2>
      <p>
        Nuestros servidores están ubicados en la Unión Europea. En caso de transferencias a terceros países, 
        nos aseguramos de que existan garantías adecuadas conforme al Reglamento General de Protección de Datos (RGPD).
      </p>

      <h2>7. Plazo de Conservación</h2>
      <p>Conservamos sus datos personales:</p>
      <ul>
        <li>Mientras mantenga una cuenta activa en nuestra plataforma.</li>
        <li>Durante un período de 7 días tras la cancelación de su suscripción (período de gracia).</li>
        <li>El tiempo necesario para cumplir con obligaciones legales (facturas, registros contables, etc.).</li>
      </ul>

      <h2>8. Sus Derechos</h2>
      <p>Conforme al RGPD, usted tiene derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> obtener confirmación sobre si tratamos sus datos y acceder a ellos.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios.</li>
        <li><strong>Limitación:</strong> solicitar la restricción del tratamiento en determinadas circunstancias.</li>
        <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y de uso común.</li>
        <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias.</li>
        <li><strong>Retirar el consentimiento:</strong> en cualquier momento, sin que afecte a la licitud del tratamiento previo.</li>
      </ul>
      <p>Para ejercer estos derechos, contacte con nosotros en: info@topvolleymanager.com</p>

      <h2>9. Seguridad de los Datos</h2>
      <p>
        Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales, incluyendo:
      </p>
      <ul>
        <li>Cifrado de datos en tránsito (HTTPS/TLS) y en reposo.</li>
        <li>Autenticación segura con contraseñas cifradas.</li>
        <li>Controles de acceso basados en roles.</li>
        <li>Copias de seguridad regulares.</li>
        <li>Monitorización continua de seguridad.</li>
      </ul>

      <h2>10. Cookies</h2>
      <p>
        Utilizamos cookies técnicas esenciales para el funcionamiento de la aplicación. 
        No utilizamos cookies de seguimiento o publicidad de terceros.
      </p>

      <h2>11. Menores de Edad</h2>
      <p>
        Nuestra aplicación puede contener datos de jugadoras menores de edad. Los datos de menores solo pueden 
        ser introducidos por entrenadores o directores deportivos autorizados, quienes son responsables de 
        obtener el consentimiento de los padres o tutores legales cuando sea necesario.
      </p>

      <h2>12. Modificaciones de esta Política</h2>
      <p>
        Nos reservamos el derecho de modificar esta política de privacidad. Cualquier cambio será notificado 
        a través de la aplicación o por correo electrónico.
      </p>

      <h2>13. Autoridad de Control</h2>
      <p>
        Si considera que el tratamiento de sus datos no es conforme a la normativa, puede presentar una 
        reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2>14. Contacto</h2>
      <p>
        Para cualquier consulta relacionada con la privacidad de sus datos:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Dirección:</strong> Top Volley Manager SL, Plaza Pontevedra 10, 2B, 15003 A Coruña, España
      </p>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

      <h2>1. Data Controller Information</h2>
      <p>
        <strong>Company Name:</strong> Top Volley Manager SL<br />
        <strong>Registered Address:</strong> Plaza Pontevedra 10, 2B, 15003 A Coruña, Spain<br />
        <strong>Contact Email:</strong> info@topvolleymanager.com
      </p>

      <h2>2. Personal Data We Collect</h2>
      <p>We collect the following types of personal data:</p>
      <ul>
        <li><strong>Registration data:</strong> name, email address, and encrypted password.</li>
        <li><strong>Player data:</strong> name, surnames, birth year, height, phone number, photograph, and sports performance data.</li>
        <li><strong>Usage data:</strong> information about how you use our application, including access logs and preferences.</li>
        <li><strong>Subscription data:</strong> billing information processed through Stripe (we do not store credit card data).</li>
      </ul>

      <h2>3. Legal Basis for Processing</h2>
      <p>The processing of your personal data is based on:</p>
      <ul>
        <li><strong>Contract performance:</strong> to provide the contracted services.</li>
        <li><strong>Consent:</strong> when you expressly grant it.</li>
        <li><strong>Legitimate interest:</strong> to improve our services and communicate with you.</li>
        <li><strong>Legal obligation:</strong> when required by applicable legislation.</li>
      </ul>

      <h2>4. Purpose of Processing</h2>
      <p>We use your personal data exclusively for:</p>
      <ul>
        <li>Managing your user account and providing access to the application.</li>
        <li>Facilitating the management of sports teams, players, and events.</li>
        <li>Processing subscription payments through secure payment providers.</li>
        <li>Sending service-related communications (updates, changes to terms, etc.).</li>
        <li>Improving the functionality and user experience of the application.</li>
      </ul>
      <p className="font-semibold">
        We commit to NOT using your personal data for commercial purposes external to the purposes of this web application. We do not sell, rent, or share your data with third parties for marketing purposes.
      </p>

      <h2>5. Data Recipients</h2>
      <p>Your data may be shared with:</p>
      <ul>
        <li><strong>Service providers:</strong> companies that help us operate the platform (hosting, payment processing, email sending).</li>
        <li><strong>Competent authorities:</strong> when legally required.</li>
      </ul>
      <p>All our providers are located in the European Union or have adequate safeguards for international transfers.</p>

      <h2>6. International Transfers</h2>
      <p>
        Our servers are located in the European Union. In case of transfers to third countries, 
        we ensure that there are adequate safeguards in accordance with the General Data Protection Regulation (GDPR).
      </p>

      <h2>7. Data Retention Period</h2>
      <p>We retain your personal data:</p>
      <ul>
        <li>While you maintain an active account on our platform.</li>
        <li>For a period of 7 days after subscription cancellation (grace period).</li>
        <li>For the time necessary to comply with legal obligations (invoices, accounting records, etc.).</li>
      </ul>

      <h2>8. Your Rights</h2>
      <p>Under the GDPR, you have the right to:</p>
      <ul>
        <li><strong>Access:</strong> obtain confirmation as to whether we process your data and access them.</li>
        <li><strong>Rectification:</strong> correct inaccurate or incomplete data.</li>
        <li><strong>Erasure:</strong> request deletion of your data when no longer necessary.</li>
        <li><strong>Restriction:</strong> request restriction of processing in certain circumstances.</li>
        <li><strong>Portability:</strong> receive your data in a structured, commonly used format.</li>
        <li><strong>Objection:</strong> object to processing of your data in certain circumstances.</li>
        <li><strong>Withdraw consent:</strong> at any time, without affecting the lawfulness of prior processing.</li>
      </ul>
      <p>To exercise these rights, contact us at: info@topvolleymanager.com</p>

      <h2>9. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your personal data, including:
      </p>
      <ul>
        <li>Encryption of data in transit (HTTPS/TLS) and at rest.</li>
        <li>Secure authentication with encrypted passwords.</li>
        <li>Role-based access controls.</li>
        <li>Regular backups.</li>
        <li>Continuous security monitoring.</li>
      </ul>

      <h2>10. Cookies</h2>
      <p>
        We use essential technical cookies for the operation of the application. 
        We do not use third-party tracking or advertising cookies.
      </p>

      <h2>11. Minors</h2>
      <p>
        Our application may contain data of minor players. Data of minors can only be 
        entered by authorized coaches or sports directors, who are responsible for 
        obtaining consent from parents or legal guardians when necessary.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We reserve the right to modify this privacy policy. Any changes will be notified 
        through the application or by email.
      </p>

      <h2>13. Supervisory Authority</h2>
      <p>
        If you believe that the processing of your data does not comply with regulations, you may file a 
        complaint with the Spanish Data Protection Agency (www.aepd.es) or your local supervisory authority.
      </p>

      <h2>14. Contact</h2>
      <p>
        For any privacy-related inquiries:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Address:</strong> Top Volley Manager SL, Plaza Pontevedra 10, 2B, 15003 A Coruña, Spain
      </p>
    </>
  );
}

function PrivacyIT() {
  return (
    <>
      <h1>Informativa sulla Privacy</h1>
      <p className="text-muted-foreground">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

      <h2>1. Informazioni sul Titolare del Trattamento</h2>
      <p>
        <strong>Ragione Sociale:</strong> Top Volley Manager SL<br />
        <strong>Sede Legale:</strong> Madrid, Spagna<br />
        <strong>Email di contatto:</strong> info@topvolleymanager.com
      </p>

      <h2>2. Dati Personali che Raccogliamo</h2>
      <p>Raccogliamo i seguenti tipi di dati personali:</p>
      <ul>
        <li><strong>Dati di registrazione:</strong> nome, indirizzo email e password criptata.</li>
        <li><strong>Dati delle giocatrici:</strong> nome, cognomi, anno di nascita, altezza, numero di telefono, fotografia e dati sulle prestazioni sportive.</li>
        <li><strong>Dati di utilizzo:</strong> informazioni su come utilizzi la nostra applicazione, inclusi registri di accesso e preferenze.</li>
        <li><strong>Dati di abbonamento:</strong> informazioni di fatturazione elaborate tramite Stripe (non memorizziamo i dati delle carte di credito).</li>
      </ul>

      <h2>3. Base Giuridica del Trattamento</h2>
      <p>Il trattamento dei tuoi dati personali si basa su:</p>
      <ul>
        <li><strong>Esecuzione contrattuale:</strong> per fornire i servizi contrattati.</li>
        <li><strong>Consenso:</strong> quando ce lo concedi espressamente.</li>
        <li><strong>Interesse legittimo:</strong> per migliorare i nostri servizi e comunicare con te.</li>
        <li><strong>Obbligo legale:</strong> quando richiesto dalla legislazione applicabile.</li>
      </ul>

      <h2>4. Finalità del Trattamento</h2>
      <p>Utilizziamo i tuoi dati personali esclusivamente per:</p>
      <ul>
        <li>Gestire il tuo account utente e fornire accesso all'applicazione.</li>
        <li>Facilitare la gestione di squadre sportive, giocatrici ed eventi.</li>
        <li>Elaborare i pagamenti degli abbonamenti tramite fornitori di pagamento sicuri.</li>
        <li>Inviare comunicazioni relative al servizio (aggiornamenti, modifiche ai termini, ecc.).</li>
        <li>Migliorare la funzionalità e l'esperienza utente dell'applicazione.</li>
      </ul>
      <p className="font-semibold">
        Ci impegniamo a NON utilizzare i tuoi dati personali per scopi commerciali esterni agli scopi di questa applicazione web. Non vendiamo, affittiamo né condividiamo i tuoi dati con terze parti per scopi di marketing.
      </p>

      <h2>5. Destinatari dei Dati</h2>
      <p>I tuoi dati possono essere condivisi con:</p>
      <ul>
        <li><strong>Fornitori di servizi:</strong> aziende che ci aiutano a operare la piattaforma (hosting, elaborazione pagamenti, invio email).</li>
        <li><strong>Autorità competenti:</strong> quando legalmente richiesto.</li>
      </ul>
      <p>Tutti i nostri fornitori sono situati nell'Unione Europea o dispongono di garanzie adeguate per i trasferimenti internazionali.</p>

      <h2>6. Trasferimenti Internazionali</h2>
      <p>
        I nostri server sono situati nell'Unione Europea. In caso di trasferimenti verso paesi terzi, 
        ci assicuriamo che esistano garanzie adeguate conformi al Regolamento Generale sulla Protezione dei Dati (GDPR).
      </p>

      <h2>7. Periodo di Conservazione</h2>
      <p>Conserviamo i tuoi dati personali:</p>
      <ul>
        <li>Finché mantieni un account attivo sulla nostra piattaforma.</li>
        <li>Per un periodo di 7 giorni dopo la cancellazione dell'abbonamento (periodo di grazia).</li>
        <li>Per il tempo necessario a rispettare gli obblighi legali (fatture, registri contabili, ecc.).</li>
      </ul>

      <h2>8. I Tuoi Diritti</h2>
      <p>Ai sensi del GDPR, hai il diritto di:</p>
      <ul>
        <li><strong>Accesso:</strong> ottenere conferma se trattiamo i tuoi dati e accedervi.</li>
        <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti.</li>
        <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati quando non sono più necessari.</li>
        <li><strong>Limitazione:</strong> richiedere la limitazione del trattamento in determinate circostanze.</li>
        <li><strong>Portabilità:</strong> ricevere i tuoi dati in un formato strutturato e di uso comune.</li>
        <li><strong>Opposizione:</strong> opporti al trattamento dei tuoi dati in determinate circostanze.</li>
        <li><strong>Revoca del consenso:</strong> in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.</li>
      </ul>
      <p>Per esercitare questi diritti, contattaci a: info@topvolleymanager.com</p>

      <h2>9. Sicurezza dei Dati</h2>
      <p>
        Implementiamo misure tecniche e organizzative appropriate per proteggere i tuoi dati personali, tra cui:
      </p>
      <ul>
        <li>Crittografia dei dati in transito (HTTPS/TLS) e a riposo.</li>
        <li>Autenticazione sicura con password criptate.</li>
        <li>Controlli di accesso basati sui ruoli.</li>
        <li>Backup regolari.</li>
        <li>Monitoraggio continuo della sicurezza.</li>
      </ul>

      <h2>10. Cookie</h2>
      <p>
        Utilizziamo cookie tecnici essenziali per il funzionamento dell'applicazione. 
        Non utilizziamo cookie di tracciamento o pubblicitari di terze parti.
      </p>

      <h2>11. Minori</h2>
      <p>
        La nostra applicazione può contenere dati di giocatrici minorenni. I dati dei minori possono essere 
        inseriti solo da allenatori o direttori sportivi autorizzati, che sono responsabili di 
        ottenere il consenso dei genitori o tutori legali quando necessario.
      </p>

      <h2>12. Modifiche a questa Informativa</h2>
      <p>
        Ci riserviamo il diritto di modificare questa informativa sulla privacy. Qualsiasi modifica sarà notificata 
        tramite l'applicazione o via email.
      </p>

      <h2>13. Autorità di Controllo</h2>
      <p>
        Se ritieni che il trattamento dei tuoi dati non sia conforme alla normativa, puoi presentare un 
        reclamo all'Agenzia Spagnola per la Protezione dei Dati (www.aepd.es) o alla tua autorità di controllo locale.
      </p>

      <h2>14. Contatti</h2>
      <p>
        Per qualsiasi domanda relativa alla privacy dei tuoi dati:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Indirizzo:</strong> Top Volley Manager SL, Madrid, Spagna
      </p>
    </>
  );
}
