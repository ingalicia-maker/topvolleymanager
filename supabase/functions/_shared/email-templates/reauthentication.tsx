/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Img,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://www.topvolleymanager.com/__l5e/assets-v1/0cf6ac33-4ab5-4ee2-a321-c637e79542bf/tvm-logo.png" alt="Top Volley Manager" width="200" style={logoStyle} />
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa el siguiente código para continuar:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código caducará en breve. Si no lo solicitaste, ignora este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: '0 0 25px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  color: '#2563eb',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '30px 0 0' }

const logoStyle = { display: 'block', margin: '0 0 24px', height: 'auto' }
