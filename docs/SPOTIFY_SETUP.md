# Configurar Spotify para Mussistant

## Por qué no puedes usar `localhost`

Desde 2025, Spotify **no permite** redirect URIs con `http://localhost:...`.  
El mensaje *"This redirect URI is not secure"* es normal al intentar añadir `localhost`.

En desarrollo debes usar la IP de loopback explícita:

```
http://127.0.0.1:8080/callback
```

Documentación oficial: [Redirect URIs (Spotify)](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)

## 1. Spotify Developer Dashboard

1. https://developer.spotify.com/dashboard → tu app
2. **Settings** → **Redirect URIs**
3. Debe estar (exactamente):

```
http://127.0.0.1:8080/callback
```

4. **Save**

No hace falta añadir `localhost`.

## 2. Archivo `.env`

```env
VITE_REDIRECT_URI=http://127.0.0.1:8080/callback
VITE_SPOTIFY_CLIENT_ID=tu_client_id
```

## 3. Abrir la app en la misma URL

```bash
npm run dev
```

Abre **siempre**:

**http://127.0.0.1:8080**

No uses `http://localhost:8080` en el navegador: la URI del OAuth debe coincidir carácter por carácter con la del Dashboard.

## 4. Supabase Auth (opcional)

En **Authentication → URL Configuration**, añade también:

| Campo | Valor |
|-------|--------|
| Site URL | `http://127.0.0.1:8080` |
| Redirect URLs | `http://127.0.0.1:8080/**` |

Puedes dejar `localhost` si ya lo usabas para login; lo crítico para Spotify es **127.0.0.1**.

## 5. Conectar de nuevo

Review → **Conectar Spotify** → autorizar.

---

## Producción

En producción usa **HTTPS**, por ejemplo:

```
https://tudominio.com/callback
```
