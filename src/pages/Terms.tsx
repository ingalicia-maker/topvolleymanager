import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Volleyball } from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Terms() {
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
          {lang === 'es' && <TermsES />}
          {lang === 'en' && <TermsEN />}
          {lang === 'it' && <TermsIT />}
          {!['es', 'en', 'it'].includes(lang) && <TermsES />}
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

function TermsES() {
  return (
    <>
      <h1>Términos y Condiciones de Uso</h1>
      <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>

      <h2>1. Información General</h2>
      <p>
        Estos Términos y Condiciones regulan el acceso y uso de la plataforma Top Volley Manager, 
        propiedad de <strong>Top Volley Manager SL</strong>, con domicilio social en Madrid, España, 
        y correo electrónico de contacto info@topvolleymanager.com.
      </p>
      <p>
        Al registrarse y utilizar nuestra plataforma, el usuario acepta íntegramente estos términos. 
        Si no está de acuerdo con alguna de estas condiciones, le rogamos que no utilice nuestros servicios.
      </p>

      <h2>2. Descripción del Servicio</h2>
      <p>
        Top Volley Manager es una aplicación web diseñada para la gestión de equipos de voleibol. 
        El servicio permite a entrenadores y directores deportivos:
      </p>
      <ul>
        <li>Gestionar plantillas de jugadoras y sus datos personales.</li>
        <li>Crear y administrar eventos, entrenamientos y partidos.</li>
        <li>Controlar ausencias y asistencia.</li>
        <li>Realizar valoraciones de rendimiento de jugadoras.</li>
        <li>Coordinar desplazamientos y transporte.</li>
        <li>Gestionar múltiples equipos dentro de un club.</li>
      </ul>

      <h2>3. Registro y Cuenta de Usuario</h2>
      <p>Para acceder a los servicios, el usuario debe:</p>
      <ul>
        <li>Ser mayor de 18 años o contar con autorización de sus padres o tutores legales.</li>
        <li>Proporcionar información veraz, exacta y actualizada.</li>
        <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
        <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta.</li>
      </ul>
      <p>
        El usuario es responsable de todas las actividades realizadas bajo su cuenta. 
        Top Volley Manager SL no será responsable de pérdidas o daños derivados del incumplimiento de estas obligaciones.
      </p>

      <h2>4. Planes y Suscripciones</h2>
      <h3>4.1 Plan Gratuito</h3>
      <p>El plan gratuito incluye:</p>
      <ul>
        <li>Gestión de 1 equipo.</li>
        <li>5 créditos diarios que se reinician a medianoche (hora local).</li>
        <li>Funcionalidades básicas de gestión.</li>
      </ul>

      <h3>4.2 Plan Premium</h3>
      <p>El plan Premium (5€/mes o 40€/año) incluye:</p>
      <ul>
        <li>Equipos ilimitados.</li>
        <li>Créditos ilimitados.</li>
        <li>Exportación de datos a Excel.</li>
        <li>Gráficos de evolución de jugadoras.</li>
        <li>Gestión de paradas de bus para desplazamientos.</li>
      </ul>

      <h3>4.3 Pagos y Facturación</h3>
      <ul>
        <li>Los pagos se procesan a través de Stripe, una plataforma segura de pagos.</li>
        <li>Las suscripciones se renuevan automáticamente al final de cada período.</li>
        <li>Los precios pueden variar y serán notificados con antelación.</li>
        <li>El usuario puede cancelar su suscripción en cualquier momento desde su perfil.</li>
      </ul>

      <h3>4.4 Cancelación y Período de Gracia</h3>
      <ul>
        <li>Al cancelar una suscripción Premium, el usuario mantiene acceso hasta el final del período pagado.</li>
        <li>Tras la cancelación, existe un período de gracia de 7 días durante el cual el usuario puede reactivar su suscripción sin perder datos.</li>
        <li>Transcurrido el período de gracia, los datos asociados a funciones Premium pueden ser eliminados.</li>
      </ul>

      <h2>5. Uso Aceptable</h2>
      <p>El usuario se compromete a:</p>
      <ul>
        <li>Utilizar la plataforma únicamente para los fines previstos (gestión deportiva).</li>
        <li>No introducir datos falsos o de terceros sin autorización.</li>
        <li>No intentar acceder a cuentas de otros usuarios.</li>
        <li>No realizar ingeniería inversa ni intentar vulnerar la seguridad del sistema.</li>
        <li>No utilizar la plataforma para actividades ilegales o que violen derechos de terceros.</li>
        <li>Obtener el consentimiento necesario de padres o tutores cuando se introduzcan datos de menores.</li>
      </ul>

      <h2>6. Protección de Datos</h2>
      <p>
        El tratamiento de datos personales se rige por nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, 
        que forma parte integrante de estos Términos y Condiciones.
      </p>
      <p>
        Nos comprometemos a cumplir con el Reglamento General de Protección de Datos (RGPD) y 
        la legislación española en materia de protección de datos. Los datos personales no serán 
        utilizados para fines comerciales externos a los propósitos de esta aplicación.
      </p>

      <h2>7. Propiedad Intelectual</h2>
      <ul>
        <li>Todos los derechos de propiedad intelectual sobre la plataforma, incluyendo código, diseño, marcas y contenidos, pertenecen a Top Volley Manager SL.</li>
        <li>El usuario conserva la propiedad de los datos que introduce en la plataforma.</li>
        <li>Se concede al usuario una licencia limitada, no exclusiva y revocable para usar la plataforma conforme a estos términos.</li>
      </ul>

      <h2>8. Limitación de Responsabilidad</h2>
      <p>Top Volley Manager SL:</p>
      <ul>
        <li>No garantiza la disponibilidad ininterrumpida del servicio.</li>
        <li>No será responsable de pérdidas de datos causadas por fallos técnicos fuera de su control.</li>
        <li>No será responsable de daños indirectos, incidentales o consecuentes.</li>
        <li>No será responsable del uso incorrecto de la plataforma por parte de los usuarios.</li>
      </ul>
      <p>
        En cualquier caso, la responsabilidad máxima de Top Volley Manager SL estará limitada al importe 
        pagado por el usuario en los 12 meses anteriores al evento que origina la reclamación.
      </p>

      <h2>9. Modificaciones del Servicio</h2>
      <p>
        Top Volley Manager SL se reserva el derecho de modificar, suspender o discontinuar 
        cualquier aspecto del servicio en cualquier momento, con o sin previo aviso.
      </p>

      <h2>10. Modificaciones de los Términos</h2>
      <p>
        Estos términos pueden ser modificados en cualquier momento. Los cambios serán notificados 
        a través de la aplicación o por correo electrónico. El uso continuado del servicio tras 
        la notificación implica la aceptación de los nuevos términos.
      </p>

      <h2>11. Terminación</h2>
      <p>
        Top Volley Manager SL puede suspender o terminar el acceso de un usuario en caso de:
      </p>
      <ul>
        <li>Incumplimiento de estos Términos y Condiciones.</li>
        <li>Uso fraudulento o abusivo del servicio.</li>
        <li>Solicitud del propio usuario.</li>
        <li>Requerimiento de autoridades competentes.</li>
      </ul>

      <h2>12. Legislación Aplicable y Jurisdicción</h2>
      <p>
        Estos Términos y Condiciones se rigen por la legislación española. Para cualquier controversia, 
        las partes se someten a la jurisdicción de los tribunales de Madrid, España, renunciando 
        expresamente a cualquier otro fuero que pudiera corresponderles.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier consulta relacionada con estos términos:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Dirección:</strong> Top Volley Manager SL, Madrid, España
      </p>

      <h2>14. Divisibilidad</h2>
      <p>
        Si alguna disposición de estos términos fuera declarada nula o inaplicable, 
        las restantes disposiciones mantendrán su plena vigencia y efecto.
      </p>
    </>
  );
}

function TermsEN() {
  return (
    <>
      <h1>Terms and Conditions of Use</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

      <h2>1. General Information</h2>
      <p>
        These Terms and Conditions govern access to and use of the Top Volley Manager platform, 
        owned by <strong>Top Volley Manager SL</strong>, with registered address in Madrid, Spain, 
        and contact email info@topvolleymanager.com.
      </p>
      <p>
        By registering and using our platform, the user fully accepts these terms. 
        If you disagree with any of these conditions, please do not use our services.
      </p>

      <h2>2. Service Description</h2>
      <p>
        Top Volley Manager is a web application designed for volleyball team management. 
        The service allows coaches and sports directors to:
      </p>
      <ul>
        <li>Manage player rosters and their personal data.</li>
        <li>Create and manage events, training sessions, and matches.</li>
        <li>Track absences and attendance.</li>
        <li>Conduct player performance evaluations.</li>
        <li>Coordinate travel and transportation.</li>
        <li>Manage multiple teams within a club.</li>
      </ul>

      <h2>3. Registration and User Account</h2>
      <p>To access the services, the user must:</p>
      <ul>
        <li>Be at least 18 years old or have authorization from parents or legal guardians.</li>
        <li>Provide truthful, accurate, and up-to-date information.</li>
        <li>Maintain the confidentiality of access credentials.</li>
        <li>Immediately notify any unauthorized use of the account.</li>
      </ul>
      <p>
        The user is responsible for all activities carried out under their account. 
        Top Volley Manager SL shall not be liable for losses or damages resulting from non-compliance with these obligations.
      </p>

      <h2>4. Plans and Subscriptions</h2>
      <h3>4.1 Free Plan</h3>
      <p>The free plan includes:</p>
      <ul>
        <li>Management of 1 team.</li>
        <li>5 daily credits that reset at midnight (local time).</li>
        <li>Basic management features.</li>
      </ul>

      <h3>4.2 Premium Plan</h3>
      <p>The Premium plan (€5/month or €40/year) includes:</p>
      <ul>
        <li>Unlimited teams.</li>
        <li>Unlimited credits.</li>
        <li>Data export to Excel.</li>
        <li>Player evolution charts.</li>
        <li>Bus stop management for travel.</li>
      </ul>

      <h3>4.3 Payments and Billing</h3>
      <ul>
        <li>Payments are processed through Stripe, a secure payment platform.</li>
        <li>Subscriptions renew automatically at the end of each period.</li>
        <li>Prices may vary and will be notified in advance.</li>
        <li>Users can cancel their subscription at any time from their profile.</li>
      </ul>

      <h3>4.4 Cancellation and Grace Period</h3>
      <ul>
        <li>When canceling a Premium subscription, the user retains access until the end of the paid period.</li>
        <li>After cancellation, there is a 7-day grace period during which the user can reactivate their subscription without losing data.</li>
        <li>After the grace period, data associated with Premium features may be deleted.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>The user agrees to:</p>
      <ul>
        <li>Use the platform only for its intended purposes (sports management).</li>
        <li>Not enter false data or data of third parties without authorization.</li>
        <li>Not attempt to access other users' accounts.</li>
        <li>Not reverse engineer or attempt to breach the system's security.</li>
        <li>Not use the platform for illegal activities or activities that violate third-party rights.</li>
        <li>Obtain necessary consent from parents or guardians when entering data of minors.</li>
      </ul>

      <h2>6. Data Protection</h2>
      <p>
        The processing of personal data is governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
        which forms an integral part of these Terms and Conditions.
      </p>
      <p>
        We are committed to complying with the General Data Protection Regulation (GDPR) and 
        Spanish data protection legislation. Personal data will not be used for commercial purposes 
        external to the purposes of this application.
      </p>

      <h2>7. Intellectual Property</h2>
      <ul>
        <li>All intellectual property rights over the platform, including code, design, trademarks, and content, belong to Top Volley Manager SL.</li>
        <li>The user retains ownership of the data they enter into the platform.</li>
        <li>A limited, non-exclusive, revocable license is granted to the user to use the platform in accordance with these terms.</li>
      </ul>

      <h2>8. Limitation of Liability</h2>
      <p>Top Volley Manager SL:</p>
      <ul>
        <li>Does not guarantee uninterrupted availability of the service.</li>
        <li>Shall not be liable for data loss caused by technical failures beyond its control.</li>
        <li>Shall not be liable for indirect, incidental, or consequential damages.</li>
        <li>Shall not be liable for improper use of the platform by users.</li>
      </ul>
      <p>
        In any case, the maximum liability of Top Volley Manager SL shall be limited to the amount 
        paid by the user in the 12 months prior to the event giving rise to the claim.
      </p>

      <h2>9. Service Modifications</h2>
      <p>
        Top Volley Manager SL reserves the right to modify, suspend, or discontinue 
        any aspect of the service at any time, with or without prior notice.
      </p>

      <h2>10. Terms Modifications</h2>
      <p>
        These terms may be modified at any time. Changes will be notified 
        through the application or by email. Continued use of the service after 
        notification implies acceptance of the new terms.
      </p>

      <h2>11. Termination</h2>
      <p>
        Top Volley Manager SL may suspend or terminate a user's access in case of:
      </p>
      <ul>
        <li>Breach of these Terms and Conditions.</li>
        <li>Fraudulent or abusive use of the service.</li>
        <li>Request from the user themselves.</li>
        <li>Requirement from competent authorities.</li>
      </ul>

      <h2>12. Applicable Law and Jurisdiction</h2>
      <p>
        These Terms and Conditions are governed by Spanish law. For any dispute, 
        the parties submit to the jurisdiction of the courts of Madrid, Spain, expressly 
        waiving any other jurisdiction that may apply to them.
      </p>

      <h2>13. Contact</h2>
      <p>
        For any inquiries related to these terms:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Address:</strong> Top Volley Manager SL, Madrid, Spain
      </p>

      <h2>14. Severability</h2>
      <p>
        If any provision of these terms is declared null or unenforceable, 
        the remaining provisions shall remain in full force and effect.
      </p>
    </>
  );
}

function TermsIT() {
  return (
    <>
      <h1>Termini e Condizioni di Utilizzo</h1>
      <p className="text-muted-foreground">Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</p>

      <h2>1. Informazioni Generali</h2>
      <p>
        Questi Termini e Condizioni regolano l'accesso e l'utilizzo della piattaforma Top Volley Manager, 
        di proprietà di <strong>Top Volley Manager SL</strong>, con sede legale a Madrid, Spagna, 
        e indirizzo email di contatto info@topvolleymanager.com.
      </p>
      <p>
        Registrandosi e utilizzando la nostra piattaforma, l'utente accetta integralmente questi termini. 
        Se non sei d'accordo con qualcuna di queste condizioni, ti preghiamo di non utilizzare i nostri servizi.
      </p>

      <h2>2. Descrizione del Servizio</h2>
      <p>
        Top Volley Manager è un'applicazione web progettata per la gestione di squadre di pallavolo. 
        Il servizio consente ad allenatori e direttori sportivi di:
      </p>
      <ul>
        <li>Gestire rose di giocatrici e i loro dati personali.</li>
        <li>Creare e gestire eventi, allenamenti e partite.</li>
        <li>Monitorare assenze e presenze.</li>
        <li>Effettuare valutazioni delle prestazioni delle giocatrici.</li>
        <li>Coordinare spostamenti e trasporti.</li>
        <li>Gestire più squadre all'interno di un club.</li>
      </ul>

      <h2>3. Registrazione e Account Utente</h2>
      <p>Per accedere ai servizi, l'utente deve:</p>
      <ul>
        <li>Avere almeno 18 anni o disporre dell'autorizzazione dei genitori o tutori legali.</li>
        <li>Fornire informazioni veritiere, accurate e aggiornate.</li>
        <li>Mantenere la riservatezza delle credenziali di accesso.</li>
        <li>Notificare immediatamente qualsiasi uso non autorizzato dell'account.</li>
      </ul>
      <p>
        L'utente è responsabile di tutte le attività svolte sotto il proprio account. 
        Top Volley Manager SL non sarà responsabile per perdite o danni derivanti dal mancato rispetto di questi obblighi.
      </p>

      <h2>4. Piani e Abbonamenti</h2>
      <h3>4.1 Piano Gratuito</h3>
      <p>Il piano gratuito include:</p>
      <ul>
        <li>Gestione di 1 squadra.</li>
        <li>5 crediti giornalieri che si azzerano a mezzanotte (ora locale).</li>
        <li>Funzionalità base di gestione.</li>
      </ul>

      <h3>4.2 Piano Premium</h3>
      <p>Il piano Premium (5€/mese o 40€/anno) include:</p>
      <ul>
        <li>Squadre illimitate.</li>
        <li>Crediti illimitati.</li>
        <li>Esportazione dati in Excel.</li>
        <li>Grafici di evoluzione delle giocatrici.</li>
        <li>Gestione fermate bus per gli spostamenti.</li>
      </ul>

      <h3>4.3 Pagamenti e Fatturazione</h3>
      <ul>
        <li>I pagamenti vengono elaborati tramite Stripe, una piattaforma di pagamento sicura.</li>
        <li>Gli abbonamenti si rinnovano automaticamente alla fine di ogni periodo.</li>
        <li>I prezzi possono variare e saranno comunicati in anticipo.</li>
        <li>L'utente può annullare l'abbonamento in qualsiasi momento dal proprio profilo.</li>
      </ul>

      <h3>4.4 Cancellazione e Periodo di Grazia</h3>
      <ul>
        <li>Quando si annulla un abbonamento Premium, l'utente mantiene l'accesso fino alla fine del periodo pagato.</li>
        <li>Dopo la cancellazione, c'è un periodo di grazia di 7 giorni durante il quale l'utente può riattivare l'abbonamento senza perdere i dati.</li>
        <li>Trascorso il periodo di grazia, i dati associati alle funzioni Premium potrebbero essere eliminati.</li>
      </ul>

      <h2>5. Uso Accettabile</h2>
      <p>L'utente si impegna a:</p>
      <ul>
        <li>Utilizzare la piattaforma solo per gli scopi previsti (gestione sportiva).</li>
        <li>Non inserire dati falsi o di terzi senza autorizzazione.</li>
        <li>Non tentare di accedere agli account di altri utenti.</li>
        <li>Non effettuare reverse engineering né tentare di violare la sicurezza del sistema.</li>
        <li>Non utilizzare la piattaforma per attività illegali o che violino i diritti di terzi.</li>
        <li>Ottenere il consenso necessario dei genitori o tutori quando si inseriscono dati di minori.</li>
      </ul>

      <h2>6. Protezione dei Dati</h2>
      <p>
        Il trattamento dei dati personali è regolato dalla nostra <Link to="/privacy" className="text-primary hover:underline">Informativa sulla Privacy</Link>, 
        che costituisce parte integrante di questi Termini e Condizioni.
      </p>
      <p>
        Ci impegniamo a rispettare il Regolamento Generale sulla Protezione dei Dati (GDPR) e 
        la legislazione spagnola in materia di protezione dei dati. I dati personali non saranno 
        utilizzati per scopi commerciali esterni agli scopi di questa applicazione.
      </p>

      <h2>7. Proprietà Intellettuale</h2>
      <ul>
        <li>Tutti i diritti di proprietà intellettuale sulla piattaforma, inclusi codice, design, marchi e contenuti, appartengono a Top Volley Manager SL.</li>
        <li>L'utente mantiene la proprietà dei dati che inserisce nella piattaforma.</li>
        <li>All'utente viene concessa una licenza limitata, non esclusiva e revocabile per utilizzare la piattaforma in conformità con questi termini.</li>
      </ul>

      <h2>8. Limitazione di Responsabilità</h2>
      <p>Top Volley Manager SL:</p>
      <ul>
        <li>Non garantisce la disponibilità ininterrotta del servizio.</li>
        <li>Non sarà responsabile per la perdita di dati causata da guasti tecnici al di fuori del suo controllo.</li>
        <li>Non sarà responsabile per danni indiretti, incidentali o consequenziali.</li>
        <li>Non sarà responsabile per l'uso improprio della piattaforma da parte degli utenti.</li>
      </ul>
      <p>
        In ogni caso, la responsabilità massima di Top Volley Manager SL sarà limitata all'importo 
        pagato dall'utente nei 12 mesi precedenti l'evento che ha dato origine al reclamo.
      </p>

      <h2>9. Modifiche al Servizio</h2>
      <p>
        Top Volley Manager SL si riserva il diritto di modificare, sospendere o interrompere 
        qualsiasi aspetto del servizio in qualsiasi momento, con o senza preavviso.
      </p>

      <h2>10. Modifiche ai Termini</h2>
      <p>
        Questi termini possono essere modificati in qualsiasi momento. Le modifiche saranno notificate 
        tramite l'applicazione o via email. L'uso continuato del servizio dopo 
        la notifica implica l'accettazione dei nuovi termini.
      </p>

      <h2>11. Risoluzione</h2>
      <p>
        Top Volley Manager SL può sospendere o terminare l'accesso di un utente in caso di:
      </p>
      <ul>
        <li>Violazione di questi Termini e Condizioni.</li>
        <li>Uso fraudolento o abusivo del servizio.</li>
        <li>Richiesta dell'utente stesso.</li>
        <li>Richiesta delle autorità competenti.</li>
      </ul>

      <h2>12. Legge Applicabile e Giurisdizione</h2>
      <p>
        Questi Termini e Condizioni sono regolati dalla legge spagnola. Per qualsiasi controversia, 
        le parti si sottopongono alla giurisdizione dei tribunali di Madrid, Spagna, rinunciando 
        espressamente a qualsiasi altra giurisdizione che potrebbe applicarsi loro.
      </p>

      <h2>13. Contatti</h2>
      <p>
        Per qualsiasi domanda relativa a questi termini:<br />
        <strong>Email:</strong> info@topvolleymanager.com<br />
        <strong>Indirizzo:</strong> Top Volley Manager SL, Madrid, Spagna
      </p>

      <h2>14. Separabilità</h2>
      <p>
        Se una qualsiasi disposizione di questi termini fosse dichiarata nulla o inapplicabile, 
        le restanti disposizioni rimarranno in pieno vigore ed effetto.
      </p>
    </>
  );
}
