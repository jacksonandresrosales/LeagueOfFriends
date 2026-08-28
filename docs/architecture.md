# Arquitectura inicial

La aplicación se divide por áreas del producto para que cada etapa pueda implementarse y documentarse de forma independiente.

- `dashboard`: perfil y rendimiento del jugador.
- `comparison`: comparaciones diarias, semanales y mensuales.
- `challenges`: creación de retos, participantes y clasificaciones.
- `riot`: comunicación exclusiva desde el servidor con la API de Riot Games.
- `notifications`: eventos internos y futuros avisos por correo.

El sistema visual se encuentra definido en `DESIGN.md` y el modelo relacional previsto está documentado en `docs/data-model.md`. La aplicación todavía utiliza datos de demostración y no se han conectado servicios externos.
