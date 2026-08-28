# LeagueOfFriends

Plataforma para seguir el progreso de jugadores de League of Legends, compararlo con amigos y crear retos privados.

## Estado del proyecto

El frontend inicial incluye el dashboard y la creación de retos con datos de demostración. El modelo relacional está documentado antes de configurar la base de datos o conectar integraciones externas.

## Estructura

```text
docs/                     Decisiones y documentación del producto
emails/                   Plantillas de correos transaccionales
public/                   Recursos públicos
src/app/                  Rutas y pantallas
src/components/dashboard/ Perfil y estadísticas del jugador
src/components/comparison/ Comparaciones entre jugadores
src/components/challenges/ Retos y clasificaciones
src/components/shared/    Componentes reutilizables
src/lib/riot/             Acceso a la API de Riot Games
src/lib/notifications/    Creación y envío de notificaciones
src/styles/               Estilos y variables visuales
src/types/                Tipos compartidos
tests/                    Pruebas automatizadas
```

## Documentación

- [`PRODUCT.md`](PRODUCT.md): visión y principios del producto.
- [`DESIGN.md`](DESIGN.md): sistema visual aprobado.
- [`docs/architecture.md`](docs/architecture.md): separación inicial de responsabilidades.
- [`docs/data-model.md`](docs/data-model.md): entidades, relaciones, acceso y sincronización.
