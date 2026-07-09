# Testing Strategy

## Overview
- Unit tests: Jest with Angular preset (NOT Jasmine - this workspace uses Jest exclusively)
- E2E tests: Playwright
- All libraries and apps have test configurations
- Run specific tests with `nx test [project-name]`
- Test coverage outputs to `{workspaceRoot}/coverage/{projectRoot}`

## Jest Configuration
All projects in the workspace have been configured with:
- **Modern setupZoneTestEnv** - Uses the latest jest-preset-angular setup method
- **Firebase polyfills** - fetch and Response polyfills for Firebase compatibility
- **ESM module support** - Proper transformIgnorePatterns for modern ES modules (GSAP, D3, es-toolkit, etc.)
- **Module name mapping** - Handles GSAP and other library imports correctly

## Writing Tests
When writing tests:
- Use Jest matchers (e.g., `expect().toBe()`, `expect().toEqual()`)
- Use `jest.fn()` for mocks, NOT `jasmine.createSpy()` or `jasmine.SpyObj`
- Use `jest.spyOn()` for spying on existing objects
- Import testing utilities from `@angular/core/testing`
- Mock external dependencies to avoid complex import chains
- Use `@Component` mock components for simpler isolated testing

## Test Commands
- **Run tests for a library**: `nx test [library-name]` (e.g., `nx test shared-api`)
- **Run tests for an app**: `nx test [app-name]`
- **Run all tests**: `npm test`
- **Run affected tests**: `npm run affected:test` - Test only affected projects

## Test File Structure
- Test files are colocated with source files using `.spec.ts` extension
- Each library has its own `jest.config.ts` and `project.json`

## Best Practices
1. Write tests alongside implementation
2. Focus on behavior, not implementation details
3. Use meaningful test descriptions
4. Keep tests isolated and independent
5. Mock external dependencies appropriately
6. Aim for high code coverage but prioritize meaningful tests