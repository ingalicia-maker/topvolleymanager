-- Add legal settings columns to clubs table
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS responsible_person_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_person_email TEXT,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT DEFAULT 'TÉRMINOS Y CONDICIONES DE USO

1. RESPONSABLE DEL TRATAMIENTO
El responsable del tratamiento de los datos personales recogidos a través de esta aplicación es el club deportivo representado por su Director Deportivo, cuyos datos de contacto figuran en la configuración del club.

2. FINALIDAD DEL TRATAMIENTO
Los datos personales (nombres, emails, teléfonos) se recogen con la única finalidad de gestionar la actividad deportiva del club: convocatorias, comunicaciones con entrenadores y coordinación de equipos.

3. LEGITIMACIÓN
La base legal para el tratamiento es el consentimiento expreso del usuario al aceptar estos términos y condiciones.

4. DESTINATARIOS
Los datos no serán cedidos a terceros, salvo obligación legal. Solo tendrán acceso los entrenadores y directivos del club en el ámbito de sus funciones.

5. DERECHOS
Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad contactando con el responsable del club.

6. CONSERVACIÓN
Los datos se conservarán mientras dure la relación con el club y posteriormente durante el tiempo legalmente establecido.

7. EXENCIÓN DE RESPONSABILIDAD
Top Volley Manager SL actúa únicamente como proveedor tecnológico de la plataforma. Cada club es responsable del uso que haga de los datos personales introducidos en la aplicación.',

ADD COLUMN IF NOT EXISTS responsibility_code TEXT DEFAULT 'CÓDIGO DE RESPONSABILIDAD DEL CLUB

Al utilizar esta aplicación, me comprometo a:

1. CONFIDENCIALIDAD
- Mantener la confidencialidad de todos los datos personales a los que tenga acceso.
- No compartir información de contacto (teléfonos, emails) con terceros ajenos al club.
- No utilizar los datos para fines distintos a los deportivos del club.

2. USO RESPONSABLE
- Utilizar la información exclusivamente para la gestión deportiva del club.
- No copiar, exportar ni almacenar datos personales fuera de esta aplicación sin autorización expresa del Director Deportivo.
- Comunicar cualquier incidencia de seguridad al Director Deportivo.

3. RESPETO
- Tratar a todos los usuarios con respeto y profesionalidad.
- No difundir información personal de menores fuera del ámbito estrictamente necesario.

4. CUMPLIMIENTO LEGAL
- Cumplir con la normativa de protección de datos vigente (RGPD).
- Colaborar con el club en el ejercicio de los derechos de los usuarios.

El incumplimiento de este código puede suponer la revocación inmediata del acceso a la aplicación.',

ADD COLUMN IF NOT EXISTS terms_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS responsibility_code_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add column to profiles to track acceptance of terms
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responsibility_code_accepted_at TIMESTAMP WITH TIME ZONE;