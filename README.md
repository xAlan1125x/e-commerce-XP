servidor-prisma-postgre/
├── features/                  # Archivos .feature (Gherkin) - Fase 2.1
├── src/                       # Código fuente Express / TS - Fase 3
│   ├── controllers/           # Rutas y controladores HTTP
│   ├── services/              # Lógica de negocio
│   ├── repositories/          # Acceso a datos
│   ├── middlewares/           # Seguridad / Manejo de errores
│   └── app.ts                 # Instancia principal de Express
├── tests/
│   └── step_definitions/      # Implementación de pasos BDD - Fase 2.2
├── prisma/
│   └── schema.prisma          # Esquema de base de datos SQLite
├── cucumber.js                # Configuración del ejecutor de BDD
└── package.json


# Sistema E-Commerce - BDD & XP Practices

## Prácticas XP Aplicadas
- **TDD/BDD:** Desarrollo guiado por escenarios de comportamiento en Gherkin y ciclos Red-Green-Refactor.
- **Diseño Simple (YAGNI):** Implementación de la solución más liviana posible sin anticipar requerimientos no especificados.
- **Refactorización Continua:** Mejoras de legibilidad y arquitectura tras pasar los tests a verde.

## Requisitos de Ejecución
1. Instalar dependencias: `npm install`
2. Ejecutar entorno de desarrollo: `npm run dev`
3. Ejecutar suite BDD (E2E): `npm run test:e2e`
4. Validar tipos de TypeScript: `npx tsc --noEmit`