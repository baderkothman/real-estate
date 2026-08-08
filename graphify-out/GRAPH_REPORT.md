# Graph Report - .  (2026-08-09)

## Corpus Check
- 169 files · ~76,415 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1153 nodes · 2748 edges · 76 communities (62 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.74)
- Token cost: 10,450 input · 8,170 output

## Community Hubs (Navigation)
- Notifications and Viewings
- Property Actions
- Messaging and Offers
- Checkout and Transactions
- Architecture and Authorization
- Discovery Actions
- Biome Configuration
- Document Actions
- Rental Applications
- Auth Route Pages
- TypeScript Configuration
- Offer Application SQL
- Admin and Property Editing
- Development Tooling
- UI Dependencies
- Stripe and Admin Services
- App Shell and Editing
- Property and User Listings
- Document Workflow SQL
- User Actions
- Admin and Transaction UI
- Component Configuration
- Informational Pages
- Analytics Dashboard
- Property Detail
- Payments Ledger SQL
- Property Listing SQL
- Property Creation Form
- Property Data Services
- Audit Log
- Dashboard Empty States
- Transaction Workflow SQL
- Profile Pages
- Initial Auth Schema
- Messaging Schema
- Pricing
- Header and User Cards
- Package Scripts
- Viewing Workflow SQL
- User Seed Script
- Decision Support SQL
- Login Flow
- Static Analysis Configuration
- Listing State SQL
- Property Comparison
- Payment and Form UI
- Security Hardening SQL
- Analytics SQL
- Fallback UI
- Party Roles and Audit SQL
- Admin Dashboard
- Brand Icon
- Auth Middleware
- Property Guard SQL
- Icon Migration Script
- Biome Package
- Lucide Package
- Next Package
- Radix Label Package
- Stripe Package
- Tabler Icons Package
- Playwright Package
- TypeScript Package
- PostCSS Configuration
- Tailwind Configuration
- Legacy Properties
- Profiles Table

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 148 edges
2. `cn()` - 65 edges
3. `createAdminClient()` - 43 edges
4. `Button` - 35 edges
5. `!.next/**` - 29 edges
6. `getUserById()` - 29 edges
7. `createNotification()` - 25 edges
8. `getPropertyById()` - 22 edges
9. `Full Transactional Architecture Remediation Plan` - 19 edges
10. `formatPrice()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Warm Luxury Visual Language` --semantically_similar_to--> `Warm Luxury Brand Direction`  [INFERRED] [semantically similar]
  CLAUDE.md → SYTEM-DESIGN.md
- `Action Service and Supabase Client Module Boundaries` --semantically_similar_to--> `Thin Routes and Service-Layer Business Logic`  [INFERRED] [semantically similar]
  TRANSACTION-PLATFORM-PLAN.md → CLAUDE.md
- `Listing State Machine` --semantically_similar_to--> `Moderated Property Lifecycle`  [INFERRED] [semantically similar]
  TRANSACTION-PLATFORM-PLAN.md → CLAUDE.md
- `Property and Listing Domain Separation` --semantically_similar_to--> `Physical Property and Market Listing Separation`  [INFERRED] [semantically similar]
  TRANSACTION-PLATFORM-PLAN.md → README.md
- `Environment-Gated Provider Abstractions and Safe Fallbacks` --semantically_similar_to--> `Mock Database-RPC E-Signature`  [INFERRED] [semantically similar]
  TRANSACTION-PLATFORM-PLAN.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Warm Luxury Interface System** — claude_visual_language, sytem_design_warm_luxury_brand_direction, sytem_design_semantic_design_tokens, sytem_design_editorial_typography, sytem_design_imagery_direction [INFERRED 0.95]
- **End-to-End Transaction Lifecycle Architecture** — readme_transaction_workspace, transaction_platform_plan_full_transaction_platform, transaction_platform_plan_listing_state_machine, transaction_platform_plan_offer_revision_immutability, transaction_platform_plan_independent_transaction_statuses [INFERRED 0.85]
- **Financial Safety Architecture** — readme_stripe_deposit_collection, readme_commission_model, transaction_platform_plan_stripe_connect_payment_model, transaction_platform_plan_double_entry_ledger, transaction_platform_plan_financial_integrity_testing [INFERRED 0.85]

## Communities (76 total, 14 thin omitted)

### Community 0 - "Notifications and Viewings"
Cohesion: 0.06
Nodes (71): getAuthenticatedUserId(), getNotificationBellDataAction(), markAllNotificationsReadAction(), markNotificationReadAction(), cancelViewingAction(), completeViewingAction(), confirmViewingAction(), errorMessage() (+63 more)

### Community 1 - "Property Actions"
Cohesion: 0.06
Nodes (64): adminPropertyAction(), AdminPropertyActionInput, auditSnapshot(), createPropertyAction(), CreatePropertyActionInput, deletePropertyAction(), errorMessage(), getAdminProfile() (+56 more)

### Community 2 - "Messaging and Offers"
Cohesion: 0.07
Nodes (51): closeInquiryAction(), errorMessage(), getAuthenticatedUserId(), replyToInquiryAction(), sendInquiryAction(), sendMessageAction(), acceptOfferAction(), counterOfferAction() (+43 more)

### Community 3 - "Checkout and Transactions"
Cohesion: 0.07
Nodes (43): CheckoutInput, createCheckoutSessionAction(), createDepositCheckoutSessionAction(), errorMessage(), getAuthenticatedUserId(), createTransactionTaskAction(), errorMessage(), getAuthenticatedUserId() (+35 more)

### Community 4 - "Architecture and Authorization"
Cohesion: 0.06
Nodes (53): Database-Backed Authorization Model, Migration-Only Schema and Policy Changes, Subscription Plans and Listing Limits, Moderated Property Lifecycle, Repository-Specific Engineering Guidance, Stripe Subscription Billing, Supabase Authentication and Persistent Data, Supabase Client Trust Boundaries (+45 more)

### Community 5 - "Discovery Actions"
Cohesion: 0.11
Nodes (37): addPropertyNoteAction(), deletePropertyNoteAction(), deleteSavedSearchAction(), errorMessage(), getAuthenticatedUserId(), hideListingAction(), saveSearchAction(), setSearchAlertActiveAction() (+29 more)

### Community 6 - "Biome Configuration"
Cohesion: 0.05
Nodes (41): source, assist, actions, enabled, css, linter, parser, files (+33 more)

### Community 7 - "Document Actions"
Cohesion: 0.13
Nodes (31): createDocumentAction(), declineDocumentAction(), errorMessage(), getAuthenticatedUserId(), getDocumentDownloadUrlAction(), getDocumentUploadUrlAction(), sendDocumentForSignatureAction(), signDocumentAction() (+23 more)

### Community 8 - "Rental Applications"
Cohesion: 0.18
Nodes (27): approveRentalApplicationAction(), conditionallyApproveApplicationAction(), errorMessage(), getAuthenticatedUserId(), markApplicationUnderReviewAction(), rejectRentalApplicationAction(), revalidateApplicationPaths(), submitRentalApplicationAction() (+19 more)

### Community 9 - "Auth Route Pages"
Cohesion: 0.14
Nodes (14): metadata, metadata, metadata, ProfileData, ForgotPasswordPage(), getResetErrorMessage(), RegisterForm, RegisterPage() (+6 more)

### Community 10 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions (+18 more)

### Community 11 - "Offer Application SQL"
Cohesion: 0.13
Nodes (17): public.enforce_application_transition(), public.enforce_offer_transition(), public.ensure_party_role(), public.is_offer_party(), public.is_rental_application_party(), public.is_transaction_party(), public.offer_revisions, public.offers (+9 more)

### Community 12 - "Admin and Property Editing"
Cohesion: 0.12
Nodes (15): EditForm, EditPropertyPageProps, propertySchema, emptyFilterFormState, FilterFormAction, filterFormReducer(), FilterFormState, PropertyFilters() (+7 more)

### Community 13 - "Development Tooling"
Cohesion: 0.09
Nodes (23): autoprefixer, axe-core, @axe-core/playwright, eslint, eslint-config-next, devDependencies, autoprefixer, axe-core (+15 more)

### Community 14 - "UI Dependencies"
Cohesion: 0.09
Nodes (23): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @radix-ui/react-select, @radix-ui/react-slot, @radix-ui/react-tabs (+15 more)

### Community 15 - "Stripe and Admin Services"
Cohesion: 0.19
Nodes (18): isSubscriptionActive(), POST(), getPlanFromPriceId(), createAdminClient(), applyCommissionToTransaction(), CommissionConfigRow, getPlatformCommissionConfig(), dbRowToPaymentIntent() (+10 more)

### Community 16 - "App Shell and Editing"
Cohesion: 0.13
Nodes (16): EditProfilePage(), CreatePropertyPage(), metadata, Footer(), WhatsAppIcon(), baseItems, MobileNav(), rightItems (+8 more)

### Community 17 - "Property and User Listings"
Cohesion: 0.13
Nodes (12): metadata, PropertiesPageProps, SearchParams, metadata, SearchParams, UsersPageProps, Pagination(), PaginationProps (+4 more)

### Community 18 - "Document Workflow SQL"
Cohesion: 0.16
Nodes (16): public.enforce_document_transition, public.decline_document(), public.document_signers, public.documents, public.is_document_signer(), public.send_document_for_signature(), public.sign_document(), public.void_document() (+8 more)

### Community 19 - "User Actions"
Cohesion: 0.20
Nodes (17): adminUserAction(), AdminUserActionInput, auditSnapshot(), getAdminProfile(), getAdminUsersAction(), getAuthenticatedUserId(), getCurrentUserProfileAction(), sanitizeProfileInput() (+9 more)

### Community 20 - "Admin and Transaction UI"
Cohesion: 0.20
Nodes (15): AdminPropertyRow(), AdminUserRow(), PropertyRow(), metadata, nextActionFor(), STATUS_STYLES, TransactionPage(), TransactionPageProps (+7 more)

### Community 21 - "Component Configuration"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 22 - "Informational Pages"
Cohesion: 0.12
Nodes (7): metadata, teamMembers, values, metadata, metadata, nextConfig, !.next/**

### Community 23 - "Analytics Dashboard"
Cohesion: 0.23
Nodes (13): AdminAnalyticsPage(), BarChartRow(), metadata, planColors, statusColors, AnalyticsSummaryRow, getAnalyticsSummary(), getPropertiesByStatus() (+5 more)

### Community 24 - "Property Detail"
Cohesion: 0.19
Nodes (12): buildPropertyJsonLd(), generateMetadata(), PropertyPage(), PropertyPageProps, PropertyGallery(), PropertyGalleryProps, Badge(), BadgeProps (+4 more)

### Community 25 - "Payments Ledger SQL"
Cohesion: 0.19
Nodes (15): public, public.commission_configs, public.disputes, public.ledger_entries, public.payment_intents, public.payments, public.payouts, public.refunds (+7 more)

### Community 26 - "Property Listing SQL"
Cohesion: 0.18
Nodes (12): public.enforce_listings_privilege_guard, public.saved_properties, public.get_properties_by_status(), public.get_properties_by_type(), public.get_top_cities(), public.listings, public.properties, public.profiles (+4 more)

### Community 27 - "Property Creation Form"
Cohesion: 0.15
Nodes (9): CreateForm, FieldErrors, propertySchema, CITIES_LEBANON, ITEMS_PER_PAGE, PARTY_ROLE_LABELS, PLAN_LIMITS, PlanLimits (+1 more)

### Community 28 - "Property Data Services"
Cohesion: 0.21
Nodes (13): PropertiesList(), sitemap(), STATIC_ROUTES, PlanBadgeProps, getProperties(), ProfileJoin, createUser(), dbRowToUser() (+5 more)

### Community 29 - "Audit Log"
Cohesion: 0.22
Nodes (11): AdminAuditLogPage(), AuditLogPageProps, buildHref(), metadata, formatDateTime(), AuditLogEntry, AuditLogInput, AuditLogRow (+3 more)

### Community 30 - "Dashboard Empty States"
Cohesion: 0.32
Nodes (8): metadata, metadata, metadata, EmptyState(), EmptyStateProps, TabsContent, TabsList, TabsTrigger

### Community 31 - "Transaction Workflow SQL"
Cohesion: 0.14
Nodes (11): public.enforce_transaction_transition, public.accept_offer(), public.approve_rental_application(), public.transaction_tasks, public.offers, public.party_roles, public.rental_applications, public.set_updated_at (+3 more)

### Community 32 - "Profile Pages"
Cohesion: 0.24
Nodes (10): DashboardProfilePage(), DashboardProfilePageProps, UserPage(), UserPageProps, UsersList(), PlanBadge(), planConfig, getSavedProperties() (+2 more)

### Community 33 - "Initial Auth Schema"
Cohesion: 0.26
Nodes (11): auth.users, public.handle_new_user, on_auth_user_created, public.get_properties_by_status(), public.get_properties_by_type(), public.get_top_cities(), public.get_users_by_plan(), public.is_admin() (+3 more)

### Community 34 - "Messaging Schema"
Cohesion: 0.29
Nodes (10): public.enforce_inquiries_privilege_guard, public.conversation_participants, public.conversations, public.inquiries, public.is_conversation_participant(), public.messages, public.reply_to_inquiry(), public.listings (+2 more)

### Community 35 - "Pricing"
Cohesion: 0.20
Nodes (8): metadata, Billing, billingDiscount, billingLabels, comparisonRows, PricingPage(), PLAN_FEATURES, PLAN_PRICES

### Community 36 - "Header and User Cards"
Cohesion: 0.25
Nodes (9): PropertyOwnerCard(), Header(), navLinks, planStyles, UserCard(), UserCardProps, getInitials(), truncate() (+1 more)

### Community 37 - "Package Scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, seed:users, start (+2 more)

### Community 38 - "Viewing Workflow SQL"
Cohesion: 0.20
Nodes (7): public.enforce_viewing_transition, public.viewings, public.listings, public.profiles, public.set_updated_at, trg_viewings_set_updated_at, trg_viewings_transition

### Community 39 - "User Seed Script"
Cohesion: 0.29
Nodes (9): admin, ADMIN_USER, DEMO_USER, ensureAuthUser(), listAllUsers(), main(), SAMPLE_USERS, seedAccount() (+1 more)

### Community 40 - "Decision Support SQL"
Cohesion: 0.31
Nodes (9): public.hidden_listings, public.notifications, public.property_notes, public.saved_searches, public.search_alerts, public.listings, public.profiles, public.set_updated_at (+1 more)

### Community 41 - "Login Flow"
Cohesion: 0.31
Nodes (6): LoginRouteProps, metadata, getLoginErrorMessage(), getSafeCallbackUrl(), LoginPage(), LoginPageProps

### Community 42 - "Static Analysis Configuration"
Cohesion: 0.22
Nodes (8): ignore, ignoreDependencies, ignoreExportsUsedInFile, $schema, @biomejs/biome, eslint, eslint-config-next, scripts/**

### Community 43 - "Listing State SQL"
Cohesion: 0.22
Nodes (5): public.log_listing_history, public.listing_history, public.listings, public.profiles, trg_listings_log_history

### Community 44 - "Property Comparison"
Cohesion: 0.46
Nodes (5): CompareTray(), PropertyCard(), readStored(), useCompare(), writeStored()

### Community 45 - "Payment and Form UI"
Cohesion: 0.32
Nodes (5): STATUS_STYLES, Input, InputProps, dateFormatter, dateTimeFormatter

### Community 46 - "Security Hardening SQL"
Cohesion: 0.36
Nodes (7): public.properties, public.get_properties_by_status(), public.get_properties_by_type(), public.get_top_cities(), public.get_users_by_plan(), public.is_admin(), public.profiles

### Community 47 - "Analytics SQL"
Cohesion: 0.29
Nodes (7): public.viewings, public.get_analytics_summary(), public.get_transaction_funnel(), public.listings, public.offers, public.profiles, public.transactions

### Community 48 - "Fallback UI"
Cohesion: 0.38
Nodes (3): Button, ButtonProps, buttonVariants

### Community 49 - "Party Roles and Audit SQL"
Cohesion: 0.40
Nodes (5): public.audit_log, public.events, public.party_roles, public.listings, public.profiles

### Community 50 - "Admin Dashboard"
Cohesion: 0.60
Nodes (4): AdminDashboardPage(), metadata, getAdminProperties(), getUsers()

### Community 51 - "Brand Icon"
Cohesion: 0.50
Nodes (5): Arched Door Cutout, House Symbol, Orange and White Palette, Real Estate App Icon, Residential Real Estate

### Community 52 - "Auth Middleware"
Cohesion: 0.40
Nodes (3): config, IMPORTANT: Always use getUser() — never getSession() — for server-side auth, IMPORTANT: Return supabaseResponse (not a new NextResponse) to preserve cookie…

## Knowledge Gaps
- **278 isolated node(s):** `metadata`, `teamMembers`, `values`, `CheckoutInput`, `CreatePropertyActionInput` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Notifications and Viewings` to `Profile Pages`, `Property Actions`, `Messaging and Offers`, `Checkout and Transactions`, `Discovery Actions`, `Document Actions`, `Rental Applications`, `Stripe and Admin Services`, `Property and User Listings`, `User Actions`, `Admin and Transaction UI`, `Property Detail`, `Property Data Services`, `Dashboard Empty States`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `!.next/**` connect `Informational Pages` to `Notifications and Viewings`, `Property Actions`, `Profile Pages`, `Pricing`, `Discovery Actions`, `Biome Configuration`, `Auth Route Pages`, `Login Flow`, `App Shell and Editing`, `Property and User Listings`, `Admin Dashboard`, `Admin and Transaction UI`, `Analytics Dashboard`, `Property Detail`, `Property Data Services`, `Audit Log`, `Dashboard Empty States`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `includes` connect `Biome Configuration` to `Informational Pages`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `metadata`, `teamMembers`, `values` to the rest of the system?**
  _278 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notifications and Viewings` be split into smaller, more focused modules?**
  _Cohesion score 0.06330532212885154 - nodes in this community are weakly interconnected._
- **Should `Property Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.05894736842105263 - nodes in this community are weakly interconnected._
- **Should `Messaging and Offers` be split into smaller, more focused modules?**
  _Cohesion score 0.07475678443420379 - nodes in this community are weakly interconnected._