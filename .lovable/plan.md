## Resumen
Agregar pago con Diamantes Free Fire, soporte de video como comprobante, sistema de bloqueo de usuarios, generación automática de key al aprobar (que funcione en el login), y expansión del bot Telegram con +20 comandos administrativos.

## Mapeo de terminología (importante)
El esquema actual usa nombres distintos a los del brief. Mantengo el esquema existente y mapeo:
- `purchases` → `payment_requests` (existente)
- `key_assigned` → `delivered_key` (existente)
- `status APPROVED/REJECTED/PENDING` → `approved/rejected/pending` (existente, lowercase)
- Bucket: el actual es `payment-proofs` (no `receipts`) — ya es público, lo reuso

## 1. Migración DB
Crear:
- `blocked_users` (email, blocked_by, reason, created_at)
- `telegram_admins` (telegram_id bigint PK, added_by, created_at)
- `banned_payments` (payment_id, reason, created_at)
- `admin_action_logs` (admin_id, action, target, details jsonb, created_at)

Añadir a `payment_requests`:
- `payment_method` text default 'paypal' (valores: 'paypal' | 'diamonds')
- `receipt_type` text default 'image' (valores: 'image' | 'video')

RLS pública (consistente con el resto del proyecto).

## 2. Frontend `src/pages/Pay.tsx`
- Nuevo paso 0: selector método (2 tarjetas glass): **PayPal** o **Diamantes Free Fire**.
- Si Diamantes: planes en diamantes (500 / 800 / 1500 = 1d/7d/30d), instrucciones (ID `6929427211`, cuenta "suessa 7p", región EE.UU.), botón **"Recargar en Garena"** que abre `https://shop.garena.com/` en nueva pestaña.
- Subida acepta `image/*,video/*`. Validación client-side: si video, leer `<video>.duration` vía ObjectURL y rechazar si >40s.
- Antes de submit: consulta `blocked_users` por email; si bloqueado, error inline.
- Polling Realtime sobre `payment_requests` por id; cuando `status=approved` y `delivered_key`, mostrar key con copiar y CTA al login. Persistir en `localStorage` (`pendingPaymentId` + `deliveredKey`) para sobrevivir reload.

## 3. Edge function `payment-submit`
- Acepta `paymentMethod`, `receiptType`.
- Verifica `blocked_users` (por email) y `banned_payments` (por id si reintento) antes de continuar.
- Si `receiptType=video` → omite IA, usa `sendVideo`.
- Si imagen → IA fail-open, prompt aún más permisivo (acepta recargas Free Fire/Garena/PayPal/transferencias).
- Insert con nuevas columnas.

## 4. Edge function `telegram-webhook` — expansión
**Helper**: `isAdmin(id)` → super-admin env (`TELEGRAM_ADMIN_ID`) o fila en `telegram_admins`. Todos los comandos validan admin antes y registran en `admin_action_logs`.

**Comandos**:
- Seguridad: `/agregaradmin`, `/eliminaradmin` (solo super-admin), `/bloquearusuario <email> [razón]`, `/desbloquearusuario`, `/verbloqueados`, `/banpaymentid`, `/unbanpaymentid`
- Pagos/keys: `/aprobar <id>`, `/rechazar <id>`, `/reenviarkey`, `/regenerarkey <id>` (marca anterior como Bloqueada, genera otra), `/verpagos [estado]`, `/ultimospagos`, `/verkeys [estado]`, `/stockkeys`
- Control: `/logs`, `/reintentartelegram <id>`, `/reiniciarwebhook`, `/verestado`, `/panelstats`, `/actividad`
- Omito `/errores` (no hay tabla email_logs ni envío email configurado)

**Aprobación (botón o `/aprobar`)** — fix crítico para que la key funcione en login:
1. Verifica `status=pending`.
2. Genera nueva key `PROXY-XXXX-XXXX`.
3. Inserta en `proxy_keys` con **`status='Activa'`** (no `Usada`), con `duration`, `duration_ms`, `device_fingerprint`, `email`, `payment_request_id`. **Esto es lo que arregla el login**: el flujo de login llama `validateKey` que exige `status='Activa'`, luego `activateKey` que la marca como `Usada` con `expires_at`. Si insertamos como `Usada` directamente, `validateKey` falla y "no deja entrar".
4. Marca `payment_requests.status='approved'`, `delivered_key=<nueva>`.
5. Edita caption Telegram con la key y "Activable en login".

## 5. Login / validate
Sin cambios — ya valida correctamente keys `Activa`. El fix del paso 4 resuelve el bug reportado.

## 6. Diseño
Mantengo glass iOS, tokens semánticos, sin emojis. Selector método = dos tarjetas grandes con iconos lucide (CreditCard / Gem), transiciones 150ms.

## Archivos
- `supabase/migrations/<new>.sql` (nuevas tablas + columnas)
- `src/pages/Pay.tsx` (selector + diamantes + video + polling)
- `supabase/functions/payment-submit/index.ts` (video + bloqueos)
- `supabase/functions/telegram-webhook/index.ts` (admin helper + comandos + fix approve)

## Notas / decisiones
- **No** uso Resend (no configurado, evito pedir secreto extra). Entrega de key vía Telegram + UI polling.
- **No** creo función `create-purchase` separada — el flujo actual `payment-submit` ya hace insert+notify en una sola llamada.
- Bucket queda como `payment-proofs` (ya público, sirve para video).
