# MASTER PLANNING PROMPT
## Autonomous Multi-Agent Software Development — Expense Tracker

# 1. YOUR ROLE

You are a **Principal AI Systems Architect, Senior Software Engineer, and Autonomous Multi-Agent Development Orchestrator** operating inside GitHub Copilot Plan Mode.

You are responsible for designing an AI-driven software engineering environment in which specialized AI coding agents autonomously develop, integrate, test, debug, and document a complete web application.

You have expertise in:

- GitHub Copilot custom agents and orchestration.
- Multi-agent software development.
- Agent instructions and context engineering.
- Agent Skills and the skills.sh ecosystem.
- Reusable prompts and prompt engineering.
- Model Context Protocol (MCP).
- Agent lifecycle hooks.
- Python, FastAPI, and SQLAlchemy.
- SQLite database design.
- React, TypeScript, and Vite.
- Secure authentication architecture.
- Automated testing.
- Playwright browser automation.
- GitHub Actions and CI.
- Software architecture and technical documentation.

Your task is to produce a complete architecture and implementation plan for an autonomous AI development environment.

**You are currently operating in PLAN MODE.**

Do not implement the application during this phase.

Do not generate application source files.

Do not install dependencies, configure tools, or modify the workspace unless explicitly authorized.

Your deliverable is an actionable plan that a subsequent GitHub Copilot Agent Mode session can execute to create the entire AI development infrastructure.

The infrastructure must then support the autonomous implementation of the application by specialized agents.

---

# 2. ACADEMIC ASSIGNMENT

The project must fulfill the requirements described in:

`project_assignment.md`

Read this file completely before designing the solution.

Treat this document as the authoritative source of academic requirements.

The assignment requires:

1. A small software application created using AI coding tools.
2. A description of the project idea and system requirements.
3. A modular architecture.
4. An explanation of the AI-assisted development workflow for each module.
5. Development reasoning and implementation steps.
6. Testing strategies and validation evidence.
7. Examples of important AI prompts and interactions.
8. A description of challenges encountered.
9. A comparison or evaluation of the AI tools used.
10. Possible future improvements.
11. At least two screenshots showing a functioning application.
12. A GitHub repository containing the source code.
13. A final Google Drive document, typically 3–6 pages.

The project documentation must reflect work that actually occurred.

Do not fabricate prompts, test results, screenshots, development challenges, or repository information.

Plan a development evidence-collection process from the beginning.

---

# 3. PROJECT OVERVIEW

## 3.1 Project name

**AI-Driven Expense Tracker**

## 3.2 Project objective

Develop a small web application allowing a single authenticated user to manage and analyze personal expenses.

The application must demonstrate:

- Secure single-user authentication.
- RESTful API development.
- Database persistence.
- CRUD operations.
- Data validation.
- Expense categorization.
- Expense filtering.
- Dashboard statistics.
- Responsive web interface.
- Automated testing.
- AI-driven implementation using specialized agents.

## 3.3 Required technology stack

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- SQLite
- Pytest

### Frontend

- React
- TypeScript
- Vite
- Vitest
- React Testing Library

### End-to-end testing

- Playwright

### Development infrastructure

- Git
- GitHub
- GitHub Copilot
- GitHub Copilot custom agents
- Repository instructions
- Agent Skills
- Reusable prompt files
- Optional MCP servers
- Optional hooks
- Optional GitHub Actions

The planning agent may recommend additional lightweight dependencies when they provide a clear benefit.

Avoid unnecessary enterprise-level infrastructure.

Do not introduce:

- Redis.
- Celery.
- Cloud databases.
- Microservices.
- Payment systems.
- Complex user management.
- External authentication providers.
- Unnecessary container orchestration.

Keep the implementation appropriate for a small educational project.

---

# 4. APPLICATION FUNCTIONAL REQUIREMENTS

## 4.1 Authentication — MANDATORY

The application must support secure authentication for exactly one user.

This is a single-user application.

There must be no public registration functionality.

### Required authentication features

1. Login using username and password.
2. Password verification using secure password hashing.
3. Protection of all expense-related API endpoints.
4. Authentication state management.
5. Logout functionality.
6. Appropriate handling of invalid credentials.
7. Appropriate handling of expired or invalid authentication credentials.
8. Automatic redirection to the login page when authentication is required.
9. Persistence of the authenticated state according to the selected security design.

### User provisioning

The application must support exactly one predefined user.

The planning agent must recommend a simple, reproducible provisioning mechanism.

Possible approaches:

- Environment-based initial credentials.
- A database initialization script.
- A development setup command.

Requirements:

- No hardcoded plaintext passwords.
- No committed real credentials.
- Passwords must be stored as secure hashes.
- Initialization must be repeatable.
- Repeated initialization must not unintentionally overwrite an existing password.
- The README must document how to configure the initial user.

### Authentication architecture decision

Evaluate:

**Option A: Session-based authentication**

Potential components:

- Server-managed session.
- Secure authentication cookie.
- Session expiration.
- Logout through session invalidation.

**Option B: JWT-based authentication**

Potential components:

- Access tokens.
- Token validation.
- Expiration.
- Secure token transport and storage.
- Logout behavior.

Compare the options considering:

- Implementation complexity.
- Security.
- Browser compatibility.
- Logout semantics.
- Credential storage.
- Local development.
- Testability.
- Suitability for a small single-user application.

Choose one approach.

Do not implement both.

Prefer the simplest secure solution appropriate to the application.

If using cookies, address:

- HttpOnly.
- Secure.
- SameSite.
- CSRF risks.
- Session expiration.

If using JWT, address:

- Signing algorithm.
- Secret management.
- Token expiration.
- Token validation.
- Secure browser storage.
- Logout semantics.
- Token revocation limitations.

Do not describe client-side token deletion as server-side invalidation.

### Authentication API

Design appropriate endpoints.

Possible examples:

`POST /api/auth/login`

`POST /api/auth/logout`

`GET /api/auth/me`

The precise API must follow the selected authentication mechanism.

### Authorization

The application contains only one user.

Every expense-related API request must require authentication.

No multi-user role-based access control is required.

The architecture must ensure that anonymous requests cannot access protected expense data.

---

## 4.2 Expense Management

The authenticated user must be able to:

- Add expenses.
- View expenses.
- Edit expenses.
- Delete expenses.
- Assign categories.
- Enter amounts.
- Specify expense dates.
- Add optional descriptions.

Recommended expense fields:

- ID.
- Amount.
- Category.
- Description.
- Date.
- Created timestamp.
- Updated timestamp.

The backend must validate submitted data.

Financial values must use a precise monetary representation rather than binary floating-point arithmetic.

Choose an appropriate representation for the SQLite database and API.

Document monetary precision and rounding rules.

---

## 4.3 Expense Categories

Provide predefined categories:

- Food.
- Transport.
- Shopping.
- Bills.
- Entertainment.
- Healthcare.
- Other.

The planning agent must decide whether categories should be represented using:

- Enumeration.
- Database table.
- Another lightweight structure.

Justify the decision.

Custom category management is optional.

Do not implement it unless it meaningfully improves the project without increasing complexity unnecessarily.

---

## 4.4 Dashboard

The authenticated user must see:

- Total expenses.
- Current-month expenses.
- Total number of expenses.
- Expenses grouped by category.
- Recent expenses.

A simple category-distribution chart is recommended.

The dashboard must use real backend data.

Do not rely on hardcoded demonstration statistics.

---

## 4.5 Filtering and Sorting

Implement:

- Category filtering.
- Date-range filtering.
- Sorting by date.

The planning agent must define filtering semantics and API parameters.

The frontend and backend must apply consistent behavior.

---

## 4.6 Database Persistence

Use SQLite.

Data must remain available after restarting the application.

The backend must provide:

- Database models.
- Session management.
- Structured data access.
- Database initialization.
- Appropriate constraints.
- Testing with isolated databases.

Determine whether database migrations are necessary.

For this small project, prefer a simple approach unless migrations provide meaningful value.

---

## 4.7 Frontend Requirements

The frontend must provide:

1. Login page.
2. Dashboard.
3. Expense list.
4. Expense creation form.
5. Expense editing form.
6. Logout control.

Required UI characteristics:

- Responsive design.
- Clear navigation.
- Consistent styling.
- Accessible controls.
- Form validation.
- Loading indicators.
- Empty states.
- Error messages.
- Success feedback.
- Deletion confirmation.

The user must not be able to access protected application views without authentication.

Frontend route protection must supplement, not replace, backend authentication enforcement.

---

# 5. PRIMARY OBJECTIVE — AUTONOMOUS AI DEVELOPMENT

The application must be implemented by specialized AI agents.

The human operator should not need to manually implement application functionality.

The overall workflow must contain five stages.

## Phase 1 — Planning

GitHub Copilot Plan Mode:

- Reads the assignment.
- Analyzes requirements.
- Designs application architecture.
- Selects AI agents.
- Selects instructions.
- Selects skills.
- Defines reusable prompts.
- Evaluates MCP integrations.
- Evaluates hooks.
- Designs testing.
- Designs documentation.
- Produces an actionable implementation plan.

## Phase 2 — AI Infrastructure Setup

GitHub Copilot Agent Mode:

- Reads the approved plan.
- Creates agent definitions.
- Creates repository instructions.
- Creates technology-specific instructions.
- Creates custom skills.
- Installs approved external skills.
- Creates reusable prompts.
- Configures necessary MCP integrations.
- Configures supported hooks.
- Creates orchestration procedures.
- Validates infrastructure readiness.

**No expense tracker application features may be implemented during this phase.**

## Phase 3 — Application Development

Specialized agents implement:

- Authentication.
- Database.
- Backend API.
- Frontend.
- Dashboard.
- Expense management.
- API integration.

## Phase 4 — Testing and Validation

Testing agents:

- Generate tests.
- Execute tests.
- Detect defects.
- Produce reports.
- Coordinate defect corrections.
- Verify regression tests.

## Phase 5 — Documentation

Documentation agents:

- Collect development evidence.
- Generate architecture documentation.
- Record actual AI interactions.
- Collect screenshots.
- Prepare the academic report.
- Validate assignment completeness.

The planning agent must ensure that each phase has explicit entry conditions, exit conditions, and required deliverables.

Do not assume agents can operate indefinitely without human involvement.

Identify supported automation capabilities and required approval checkpoints.

---

# 6. MULTI-AGENT SYSTEM DESIGN

Design a practical, maintainable multi-agent architecture.

Evaluate the following agents.

You may merge agents where doing so reduces unnecessary complexity.

Do not introduce additional agents without a clear benefit.

## 6.1 Orchestrator Agent

Suggested name:

`orchestrator`

Responsibilities:

- Coordinate the entire development lifecycle.
- Read and follow the approved plan.
- Track task dependencies.
- Assign work.
- Manage agent handoffs.
- Monitor implementation progress.
- Coordinate integration.
- Trigger testing.
- Coordinate defect resolution.
- Validate completion criteria.
- Initiate documentation.

Determine whether this should be a dedicated custom agent or whether native Copilot orchestration provides sufficient functionality.

Investigate supported delegation mechanisms.

Do not assume automatic agent invocation is available.

If full orchestration is unsupported, design a workflow using explicit prompts and structured handoff artifacts.

## 6.2 Backend Agent

Suggested name:

`backend`

Technologies:

- Python.
- FastAPI.
- SQLAlchemy.
- Pydantic.
- SQLite.

Responsibilities:

- Create backend architecture.
- Implement database models.
- Implement database initialization.
- Implement authentication.
- Implement password hashing.
- Implement session or token validation.
- Implement protected endpoints.
- Implement expense CRUD.
- Implement filtering.
- Implement dashboard statistics.
- Implement input validation.
- Implement error handling.
- Write backend tests.
- Publish API contracts.

The backend agent must own authentication security.

It must not rely on frontend route protection.

### Backend ownership

Specify directories this agent may modify.

Define shared artifacts, such as the API contract, that it must publish for other agents.

## 6.3 Frontend Agent

Suggested name:

`frontend`

Technologies:

- React.
- TypeScript.
- Vite.

Responsibilities:

- Create frontend architecture.
- Implement the login page.
- Implement authentication state management.
- Implement protected routes.
- Implement logout interaction.
- Implement dashboard.
- Implement expense list.
- Implement creation and editing forms.
- Implement filtering.
- Integrate backend APIs.
- Handle authentication failures.
- Implement loading and error states.
- Write component tests.

The frontend agent must follow the authentication contract produced by the backend.

It must not invent incompatible authentication behavior.

## 6.4 Testing Agent

Suggested name:

`testing`

Responsibilities:

- Analyze all requirements.
- Design testing scenarios.
- Implement backend tests.
- Implement frontend tests.
- Implement authentication tests.
- Implement API integration tests.
- Implement end-to-end tests.
- Execute automated tests.
- Investigate failures.
- Report defects.
- Validate fixes.
- Produce testing evidence.

The testing agent must be independent from implementation agents.

Prefer a clear separation between:

- Test ownership.
- Production code ownership.

The testing agent should not silently modify production code when reporting defects.

Instead, it should produce actionable defect reports.

## 6.5 Documentation Agent

Suggested name:

`documentation`

Responsibilities:

- Maintain architecture documentation.
- Record AI-assisted development activities.
- Record important prompts.
- Record architectural decisions.
- Capture actual testing results.
- Record genuine challenges.
- Capture screenshots.
- Generate the academic report.

The documentation agent must ensure that all assignment requirements are covered.

It must not fabricate evidence.

## 6.6 Optional Review Agent

Evaluate whether a separate code-review agent is justified.

Potential responsibilities:

- Architecture consistency.
- Code quality.
- Security review.
- Authentication review.
- API contract validation.
- Maintainability.
- Unnecessary complexity detection.

For this application, consider assigning these responsibilities to the testing or orchestration agent rather than introducing another specialized agent.

---

# 7. AGENT DEFINITIONS

For every recommended agent, provide:

1. Agent name.
2. Purpose.
3. Responsibilities.
4. Technologies.
5. Required tools.
6. Required permissions.
7. Allowed files.
8. Restricted files.
9. Required instructions.
10. Required skills.
11. Relevant prompts.
12. Expected inputs.
13. Expected outputs.
14. Dependencies.
15. Handoff mechanism.
16. Validation requirements.
17. Definition of Done.

Recommend concrete agent filenames.

For example:

`.github/agents/backend.agent.md`

Verify actual GitHub Copilot file conventions.

Check:

- Agent discovery.
- Agent invocation.
- Tool access.
- Subagent capabilities.
- Handoffs.
- Parallel execution.
- Context transfer.
- Execution restrictions.

Distinguish verified capabilities from assumptions.

---

# 8. COPILOT INSTRUCTIONS ARCHITECTURE

Design a coherent instruction hierarchy.

## 8.1 Repository-Wide Instructions

Recommended location:

`.github/copilot-instructions.md`

Include:

- Project goals.
- Technology stack.
- Architecture.
- Coding conventions.
- Security principles.
- Testing requirements.
- Documentation requirements.
- Scope restrictions.
- Agent collaboration rules.
- Definition of Done.

## 8.2 Backend Instructions

Include:

- Python coding standards.
- Type annotations.
- FastAPI project structure.
- SQLAlchemy patterns.
- Pydantic validation.
- Database sessions.
- API contracts.
- Financial precision.
- Authentication.
- Password hashing.
- Security-sensitive configuration.
- Error handling.
- Backend testing.

## 8.3 Frontend Instructions

Include:

- React architecture.
- TypeScript strict typing.
- Functional components.
- Hooks.
- State management.
- API services.
- Authentication state.
- Protected routes.
- Secure credential handling.
- Form validation.
- Accessibility.
- Responsive design.
- Component testing.

## 8.4 Testing Instructions

Include:

- Test organization.
- Test naming.
- Test isolation.
- Mocking.
- Authentication test fixtures.
- Database isolation.
- API tests.
- Component tests.
- End-to-end tests.
- Regression testing.
- Failure reporting.

## 8.5 Documentation Instructions

Include procedures for recording:

- Architectural decisions.
- Development progress.
- Actual AI prompts.
- Agent interactions.
- Testing results.
- Challenges.
- Screenshots.
- Repository information.

Use path-specific instructions where supported.

Explain instruction scope and precedence.

Avoid duplicate rules across instruction files.

---

# 9. AGENT SKILLS STRATEGY

Research and recommend Agent Skills.

Use:

https://skills.sh/

Skills may be external or custom.

## 9.1 External Skills

Investigate skills related to:

- Python.
- FastAPI.
- React.
- TypeScript.
- Authentication.
- API security.
- Software testing.
- Playwright.
- Code review.
- Debugging.
- Documentation.
- Git workflows.

Evaluate:

- Relevance.
- Maintainer credibility.
- Maintenance activity.
- Compatibility.
- Installation procedure.
- Security.
- Practical benefit.
- Overlap with other skills.

For every recommended external skill provide:

- Name.
- Source.
- Purpose.
- Associated agents.
- Verified installation command.
- Security considerations.

Do not invent skills or installation commands.

Do not recommend installing large numbers of skills without justification.

## 9.2 Custom Skills

Evaluate the need for the following custom skills.

### FastAPI Feature Development

Workflow covering:

- Database models.
- Schemas.
- Service functions.
- API routes.
- Error handling.
- Tests.

### Single-User Authentication

Workflow covering:

- Secure initial user provisioning.
- Password hashing.
- Login.
- Authentication validation.
- Protected endpoints.
- Logout.
- Expiration.
- Security tests.

### React Feature Development

Workflow covering:

- Components.
- API integration.
- State management.
- Form validation.
- Component testing.

### Automated Testing

Workflow covering:

- Test generation.
- Test execution.
- Failure analysis.
- Defect reporting.
- Regression validation.

### AI Development Evidence

Workflow covering:

- Capturing actual AI prompts.
- Recording decisions.
- Tracking completed activities.
- Recording test results.
- Collecting screenshots.
- Supporting academic documentation.

### Agent Handoffs

Workflow covering:

- Status reporting.
- Shared artifacts.
- Dependencies.
- Known issues.
- Next actions.

For each custom skill specify:

- Purpose.
- Trigger conditions.
- Inputs.
- Steps.
- Outputs.
- File location.
- Associated agents.

Explain why the capability belongs in a skill rather than a persistent instruction or reusable prompt.

---

# 10. REUSABLE PROMPT LIBRARY

Design a reusable prompt library.

Recommended location:

`.github/prompts/`

Evaluate the following prompts.

### Infrastructure Setup

`setup-environment.prompt.md`

Creates and validates the AI development infrastructure.

### Authentication Implementation

`implement-auth.prompt.md`

Initiates single-user authentication implementation.

### Backend Implementation

`implement-backend.prompt.md`

Initiates backend application development.

### Frontend Implementation

`implement-frontend.prompt.md`

Initiates frontend development.

### Integration

`integrate-application.prompt.md`

Connects frontend and backend.

### Test Generation

`generate-tests.prompt.md`

Generates tests for relevant features.

### Authentication Security Review

`review-auth-security.prompt.md`

Checks authentication security.

### Full Validation

`validate-application.prompt.md`

Runs required checks.

### Defect Resolution

`fix-defects.prompt.md`

Coordinates corrections.

### Code Review

`review-implementation.prompt.md`

Reviews architecture and code quality.

### Documentation

`generate-exam-documentation.prompt.md`

Prepares academic documentation.

### Final Audit

`final-audit.prompt.md`

Checks all requirements.

For every prompt provide:

- Purpose.
- Intended agent.
- Invocation mechanism.
- Required context.
- Inputs.
- Outputs.
- Completion criteria.

Remove unnecessary or redundant prompts.

---

# 11. MCP SERVER EVALUATION

Evaluate whether MCP integrations improve the workflow.

Candidates:

## GitHub MCP

Possible uses:

- Repository operations.
- Issues.
- Pull requests.
- Repository inspection.

Evaluate whether native Git and Copilot capabilities are sufficient.

## Playwright MCP

Possible uses:

- Browser interaction.
- UI validation.
- Screenshot generation.
- End-to-end verification.

Evaluate its additional value compared with the standard Playwright test runner.

## SQLite MCP

Possible uses:

- Database inspection.
- Data validation.
- Query execution.

Evaluate whether direct Python or SQLite tooling is simpler.

## Filesystem MCP

Evaluate whether it duplicates native coding-agent tools.

## Other MCP Servers

Recommend additional integrations only when necessary.

For each candidate provide:

- Name.
- Purpose.
- Required agents.
- Installation.
- Configuration.
- Permissions.
- Security considerations.
- Mandatory or optional status.

Verify actual compatibility.

Do not install MCP servers during planning.

---

# 12. HOOKS AND QUALITY GATES

Investigate supported Copilot hooks.

Evaluate automated checks for:

- Python formatting.
- Python linting.
- Backend tests.
- Frontend linting.
- TypeScript compilation.
- Frontend tests.
- End-to-end tests.
- Authentication security checks.
- Completion validation.

Potential tools:

- Ruff.
- Pytest.
- ESLint.
- TypeScript compiler.
- Vitest.
- Playwright.

Determine which checks belong in:

- Copilot hooks.
- Git hooks.
- Local scripts.
- GitHub Actions.

Avoid duplicated expensive checks.

For every proposed hook define:

- Trigger.
- Action.
- Scope.
- Failure behavior.
- Configuration.
- Compatibility.

If a required hook mechanism is unavailable, design a standard script or CI-based alternative.

---

# 13. APPLICATION ARCHITECTURE

Design a clean and maintainable architecture.

Expected high-level architecture:

```text
                    USER
                      |
                      v
                React Frontend
                      |
              Authentication UI
                      |
               Protected Views
                      |
                      v
                  REST API
                      |
                      v
               FastAPI Backend
                      |
          +-----------+-----------+
          |                       |
          v                       v
    Authentication          Expense Services
          |                       |
          +-----------+-----------+
                      |
                      v
                   SQLAlchemy
                      |
                      v
                    SQLite
```

Define:

- Frontend architecture.
- Backend architecture.
- Authentication mechanism.
- Database design.
- API design.
- Shared API contracts.
- Error-handling strategy.
- Configuration strategy.
- Testing boundaries.

Provide an architecture diagram.

## API Design

Specify endpoints for:

- Login.
- Logout.
- Current authentication status.
- Expense creation.
- Expense retrieval.
- Expense updates.
- Expense deletion.
- Expense filtering.
- Dashboard summary.

For every endpoint define:

- Method.
- Path.
- Purpose.
- Authentication requirements.
- Request schema.
- Response schema.
- Status codes.
- Validation rules.
- Error conditions.

Use consistent REST API conventions.

---

# 14. AUTONOMOUS DEVELOPMENT ORCHESTRATION

Design a dependency-aware execution workflow.

## Stage A — Infrastructure Bootstrap

The setup agent:

1. Creates repository structure.
2. Creates custom agents.
3. Creates instructions.
4. Creates custom skills.
5. Installs approved external skills.
6. Creates prompts.
7. Configures approved MCP integrations.
8. Configures supported hooks.
9. Creates validation scripts.
10. Validates infrastructure.

Do not begin application implementation before infrastructure validation succeeds.

## Stage B — Backend Foundation

Backend agent:

1. Creates project structure.
2. Configures dependencies.
3. Configures SQLite.
4. Creates database models.
5. Implements database initialization.
6. Defines shared schemas.
7. Establishes API conventions.
8. Publishes initial API contracts.

## Stage C — Authentication

Backend agent:

1. Implements initial user provisioning.
2. Implements secure password hashing.
3. Implements login.
4. Implements session or token validation.
5. Implements logout.
6. Adds authentication dependencies.
7. Protects API routes.
8. Adds authentication tests.

Testing agent:

1. Tests successful login.
2. Tests invalid credentials.
3. Tests unauthenticated access.
4. Tests expiration.
5. Tests logout behavior.
6. Tests password storage.
7. Tests protected endpoints.

Authentication must be validated before protected expense functionality is considered complete.

## Stage D — Expense Backend

Backend agent:

1. Implements expense models.
2. Implements schemas.
3. Implements CRUD services.
4. Implements API endpoints.
5. Implements filtering.
6. Implements dashboard calculations.
7. Adds tests.
8. Publishes updated API contracts.

## Stage E — Frontend

Frontend agent:

1. Creates React project.
2. Implements login interface.
3. Implements authenticated navigation.
4. Implements dashboard.
5. Implements expense list.
6. Implements expense forms.
7. Implements filtering.
8. Integrates API services.
9. Handles authentication failures.
10. Adds component tests.

Identify frontend work that may run in parallel with backend development.

## Stage F — Integration

Verify:

- Authentication works between frontend and backend.
- Protected routes work.
- Expense CRUD works.
- Filtering works.
- Dashboard data is accurate.
- Logout works.
- API errors are handled.
- Database persistence works.

## Stage G — Testing

Execute:

- Backend unit tests.
- Authentication tests.
- API integration tests.
- Frontend component tests.
- End-to-end tests.
- Regression tests.

## Stage H — Defect Resolution

For every failing check:

1. Identify the defect.
2. Determine its owner.
3. Produce an actionable report.
4. Assign the correction.
5. Re-run the failing test.
6. Run relevant regression tests.
7. Record the result.

Define a retry limit.

Avoid infinite correction loops.

Escalate unresolved blockers.

## Stage I — Documentation

Documentation agent:

1. Collects evidence.
2. Generates technical documentation.
3. Documents actual agent interactions.
4. Captures screenshots.
5. Records challenges.
6. Prepares the final report.

---

# 15. AGENT HANDOFFS AND STATE MANAGEMENT

Design a shared state-management approach.

Potential documents:

`docs/architecture.md`

`docs/api-contract.md`

`docs/development-log.md`

`docs/decisions.md`

`docs/test-report.md`

`docs/assignment-evidence.md`

`docs/agent-handoffs.md`

Determine which are genuinely necessary.

Define a standardized handoff report.

Each report must include:

- Task identifier.
- Responsible agent.
- Completed work.
- Modified files.
- Important decisions.
- Test results.
- Known issues.
- Dependencies.
- Next action.

Define task states:

- TODO.
- IN_PROGRESS.
- BLOCKED.
- COMPLETED.
- VERIFIED.

Task states must be evidence-based.

Determine how agents should avoid conflicting file modifications.

Prefer clear file ownership and sequential handoffs over unnecessarily complex branching strategies.

---

# 16. TESTING STRATEGY

Testing is a mandatory part of the project.

Design a complete but proportionate testing strategy.

## 16.1 Authentication Tests

Test:

- Successful login.
- Incorrect username.
- Incorrect password.
- Empty credentials.
- Missing authentication.
- Invalid authentication credential.
- Expired authentication credential.
- Logout.
- Authentication status after logout.
- Protected API access.
- Secure password hashing.
- Initial user provisioning.
- Repeated initialization.
- Authentication persistence according to the chosen design.

If the selected authentication mechanism uses cookies, include relevant CSRF and cookie-policy tests.

If using JWT, test expiration and the actual logout semantics supported by the implementation.

Do not claim that previously issued JWTs are revoked unless the design really enforces revocation.

## 16.2 Expense Backend Tests

Test:

- Create expense.
- Retrieve expenses.
- Retrieve individual expense.
- Update expense.
- Delete expense.
- Filter by category.
- Filter by date.
- Reject invalid amounts.
- Reject invalid categories.
- Handle nonexistent IDs.
- Preserve monetary precision.
- Calculate dashboard statistics.
- Persist database data.

Every expense API test must account for authentication.

## 16.3 Frontend Tests

Test:

- Login form.
- Invalid login response.
- Protected navigation.
- Logout.
- Authentication expiration handling.
- Dashboard rendering.
- Expense list rendering.
- Expense form validation.
- Successful expense creation.
- Editing.
- Deletion confirmation.
- Loading states.
- Error states.

## 16.4 End-to-End Tests

Create at least one complete browser workflow:

1. Open the application.
2. Verify that the login page appears.
3. Attempt invalid login.
4. Verify appropriate error handling.
5. Log in successfully.
6. Open the dashboard.
7. Create an expense.
8. Verify that the expense appears.
9. Edit the expense.
10. Verify changes.
11. Filter expenses.
12. Verify dashboard totals.
13. Delete the expense.
14. Verify deletion.
15. Log out.
16. Verify protected access is denied.

Add a separate persistence scenario:

1. Authenticate.
2. Create an expense.
3. Restart or reload relevant application components.
4. Authenticate again if necessary.
5. Verify the expense remains stored.

Tests must use isolated data.

They must be repeatable.

The testing agent must provide actual execution results.

---

# 17. SECURITY REQUIREMENTS

Apply appropriate security standards without overengineering.

## Authentication

- Use a maintained password-hashing algorithm.
- Never store plaintext passwords.
- Never hardcode production credentials.
- Protect sensitive configuration.
- Validate authentication on the backend.
- Handle authentication expiration.
- Implement meaningful logout behavior.
- Avoid exposing sensitive authentication details in error messages.

## API

- Validate all inputs.
- Use appropriate HTTP status codes.
- Restrict CORS appropriately.
- Avoid leaking internal exceptions.
- Protect private routes.

## Database

- Use parameterized operations through SQLAlchemy.
- Enforce appropriate constraints.
- Use isolated test databases.
- Avoid committing real application data.

## Agents

- Review external skills before installation.
- Restrict MCP permissions.
- Avoid unnecessary shell execution privileges.
- Require authorization before destructive actions.
- Avoid leaking secrets into agent logs.
- Avoid committing generated credentials.

---

# 18. PROJECT DIRECTORY STRUCTURE

Design a complete repository layout.

Include:

- Backend.
- Frontend.
- Backend tests.
- Frontend tests.
- End-to-end tests.
- Authentication module.
- Agent definitions.
- Copilot instructions.
- Skills.
- Reusable prompts.
- Optional hooks.
- Optional MCP configuration.
- Automation scripts.
- Documentation.
- Evidence.
- README.
- .gitignore.
- Environment examples.
- GitHub Actions if justified.

Distinguish between:

1. Infrastructure files created during Phase 2.
2. Application files created during Phase 3.
3. Testing artifacts created during Phase 4.
4. Documentation artifacts created during Phase 5.

Provide a directory tree.

Do not create files yet.

---

# 19. DEVELOPMENT ENVIRONMENT

Assume development in VS Code on Linux unless inspection shows otherwise.

Determine:

- Required Python version.
- Required Node.js version.
- Required npm version.
- Dependency management.
- Virtual environment strategy.
- Local startup commands.
- Database initialization.
- Initial user provisioning.
- Test commands.
- Linting commands.
- Type-checking commands.

The environment must be reproducible.

Investigate whether:

- Shell scripts.
- Makefile targets.
- npm scripts.

would simplify agent execution.

Avoid unnecessary setup complexity.

---

# 20. CI AND GITHUB

Prepare the project for GitHub publication.

Recommend:

- README.
- .gitignore.
- Dependency declarations.
- Appropriate lockfiles.
- Basic branching strategy.
- Useful commit conventions.

Evaluate a minimal GitHub Actions workflow.

Potential checks:

- Backend linting.
- Backend tests.
- Authentication tests.
- Frontend linting.
- TypeScript checking.
- Frontend tests.
- Frontend production build.

Do not introduce complex CI infrastructure.

The GitHub repository must contain the actual application code.

Never fabricate repository URLs.

---

# 21. DEVELOPMENT EVIDENCE COLLECTION

The project must document AI-assisted development.

Create a lightweight evidence strategy.

For each module, capture:

- Technical objective.
- Responsible AI tool or agent.
- Reasoning behind the approach.
- Implementation steps.
- Important prompts.
- Files generated.
- Testing strategy.
- Actual test results.
- Challenges encountered.
- Solutions applied.

Modules should include:

1. Authentication.
2. Backend API.
3. Database and persistence.
4. Frontend.
5. Testing and integration.

Modules may be combined in the final report to satisfy the assignment's length requirement.

The documentation process should start during infrastructure setup.

Do not wait until the application is finished to begin collecting evidence.

---

# 22. FINAL ACADEMIC DOCUMENTATION

The final documentation must comply with `project_assignment.md`.

Prepare a document containing:

## Project Overview

- Project purpose.
- Technology stack.
- Functional requirements.

## System Architecture

- Architecture diagram.
- Technological modules.
- AI agent responsibilities.

## Development Process

For each module:

- Approach and reasoning.
- AI-assisted workflow.
- Testing.
- Tools used.
- Representative prompts.

## Challenges and Tool Comparison

Include:

- Actual challenges.
- How they were resolved.
- Which AI capabilities were most useful.
- Improvements for future work.

## Working System Evidence

Include at least two screenshots.

Recommended:

1. Login page or authenticated dashboard.
2. Expense list with working functionality.

Additional evidence may include:

- Successful test output.
- FastAPI API documentation.
- Browser testing.

## GitHub Repository

Include the actual repository URL.

## Final Submission

Prepare the document for Google Drive.

If the environment supports direct Google Drive document creation and sharing, determine the required permissions and approval steps.

Otherwise, prepare a suitable document for manual upload.

Do not claim that publication or sharing occurred unless verified.

---

# 23. ACCEPTANCE CRITERIA

Define measurable acceptance criteria for every phase.

## Phase 2 — Infrastructure

- Agent definitions exist.
- Instructions are valid.
- Skills are available.
- Prompts are available.
- Necessary tools work.
- Approved MCP servers work.
- Quality gates work.
- Handoff mechanisms are documented.

## Phase 3 — Application

- Login works.
- Invalid credentials are rejected.
- Passwords are securely stored.
- Protected endpoints reject anonymous requests.
- Logout behaves according to the selected authentication design.
- Expense CRUD works.
- Filtering works.
- Dashboard calculations work.
- Data persists.
- Frontend and backend integrate successfully.

## Phase 4 — Testing

- Authentication tests pass.
- Backend tests pass.
- Frontend tests pass.
- End-to-end tests pass.
- Critical defects are resolved.
- Results are documented.

## Phase 5 — Documentation

- Assignment requirements are covered.
- AI interactions are documented.
- Actual testing evidence is included.
- Two or more screenshots exist.
- GitHub repository is available.
- Final report is ready for submission.

Do not consider a phase completed without verification.

---

# 24. REQUIRED OUTPUT FROM THIS PLANNING SESSION

Produce the following sections.

## A. Executive Summary

Explain the proposed solution and multi-agent development strategy.

## B. Assignment Compliance Matrix

Map each requirement in `project_assignment.md` to the implementation plan and evidence.

## C. Application Architecture

Provide:

- Architecture diagram.
- Technology choices.
- Authentication design.
- Backend modules.
- Frontend modules.
- Database models.
- API endpoints.

## D. Authentication Architecture Decision

Compare session-based authentication and JWT.

Select one.

Explain:

- Security.
- Complexity.
- Storage.
- Expiration.
- Logout.
- Testing.
- Initial user provisioning.

## E. Multi-Agent Architecture

Provide:

- Recommended agents.
- Responsibilities.
- Required tools.
- Allowed files.
- Dependencies.
- Handoff procedures.
- Invocation mechanisms.

## F. Copilot Instructions

Provide:

- Required instruction files.
- File paths.
- Scope.
- Main content.
- Precedence.

## G. Agent Skills

Provide:

- Recommended external skills.
- Verified sources.
- Installation commands.
- Custom skills.
- Agent-to-skill mapping.

## H. Reusable Prompts

Provide:

- Recommended prompt files.
- Purpose.
- Agent mapping.
- Required context.
- Expected outputs.

## I. MCP and Hooks

Provide:

- Recommended integrations.
- Required configurations.
- Security considerations.
- Supported hooks.
- Fallback mechanisms.

## J. Repository Structure

Provide a complete directory tree.

Identify files created in each development phase.

## K. Autonomous Execution Workflow

Describe:

- Execution order.
- Dependencies.
- Parallelizable tasks.
- Handoffs.
- Validation gates.
- Failure recovery.
- Human approval requirements.

## L. Testing Strategy

Include:

- Authentication tests.
- Backend tests.
- Frontend tests.
- Integration tests.
- End-to-end tests.
- Security checks.

## M. Documentation Strategy

Describe how evidence will be recorded throughout development.

## N. Implementation Roadmap

Provide a detailed task list.

Every task must contain:

- Task ID.
- Description.
- Responsible agent.
- Dependencies.
- Expected artifacts.
- Validation method.
- Completion criteria.

## O. Risks and Mitigations

Evaluate:

- Unsupported orchestration features.
- Missing tools.
- Incompatible skills.
- Agent context loss.
- Conflicting changes.
- Authentication security defects.
- API integration defects.
- Failing tests.
- Missing documentation evidence.
- Excessive complexity.

## P. Infrastructure Bootstrap Instructions

Provide a dedicated section titled:

**Instructions for the Infrastructure Setup Agent**

This section must explain how the subsequent Copilot Agent Mode session should:

1. Read the approved plan.
2. Create all agent definitions.
3. Create all repository instructions.
4. Create required custom skills.
5. Install approved external skills.
6. Create reusable prompts.
7. Configure necessary MCP servers.
8. Configure supported hooks.
9. Create orchestration artifacts.
10. Create validation scripts.
11. Verify that the infrastructure is ready.

The bootstrap process must not implement application features.

## Q. First Execution Prompt

Generate a ready-to-use prompt for the next GitHub Copilot Agent Mode session.

The prompt must instruct Copilot to implement only the AI development infrastructure.

It must explicitly prevent premature application development.

The result must be sufficient for an AI implementation agent to execute the approved architecture without redesigning it.

---

# 25. PLANNING PRINCIPLES

Follow these principles.

### AI-First Implementation

All application functionality must be created by AI coding agents.

### Practical Autonomy

Use the maximum practical automation supported by the actual environment.

Do not claim unsupported capabilities.

### Simplicity

This is a small educational application.

Do not overengineer.

### Security

Authentication and expense data must be handled securely.

### Separation of Responsibilities

Each agent must have a clearly defined purpose.

### Reproducibility

The complete environment must be reproducible from the repository.

### Testing

Every completed feature must be validated.

### Traceability

The development process must preserve evidence of AI contributions.

### Evidence-Based Completion

Agents must not report success without actual validation.

### Explicit Phase Boundaries

Planning, infrastructure setup, application development, testing, and documentation must remain separate stages.

---

# 26. FINAL INSTRUCTIONS

Before finalizing your plan:

1. Read `project_assignment.md` completely.
2. Inspect the existing workspace.
3. Identify the actual Copilot environment.
4. Verify supported agent configuration mechanisms.
5. Verify skills.sh recommendations.
6. Evaluate MCP integrations.
7. Evaluate hooks.
8. Confirm the authentication architecture.
9. Review agent responsibilities.
10. Remove unnecessary components.
11. Confirm that the workflow is executable.
12. Ensure tests cover all mandatory functionality.
13. Ensure development evidence can be collected.
14. Confirm that all academic requirements are addressed.

Classify every proposed component as:

- **REQUIRED**
- **RECOMMENDED**
- **OPTIONAL**
- **UNSUPPORTED / UNVERIFIED**

Clearly separate observed facts from assumptions.

When verification is unavailable, state the limitation and choose a reasonable default.

Do not block planning with unnecessary clarification questions.

**DO NOT IMPLEMENT THE APPLICATION.**

**DO NOT CREATE AGENT FILES YET.**

**DO NOT INSTALL SKILLS OR MCP SERVERS YET.**

**DO NOT MODIFY THE WORKSPACE.**

Your final deliverable must be a detailed, executable blueprint for creating a complete autonomous AI software development environment.

Once the plan is approved, a subsequent GitHub Copilot Agent Mode session will create the infrastructure.

Only after that infrastructure is validated will specialized AI agents begin implementing the expense tracker.

**Begin by analyzing `project_assignment.md` and designing the complete multi-agent development architecture.**
