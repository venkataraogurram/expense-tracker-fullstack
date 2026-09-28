# Expense Tracker — Spring Boot + React + MySQL

A full-stack personal expense tracker. Add, edit, delete and filter expenses,
and see a running total with a per-category breakdown. Amounts are in Indian
Rupees (₹).

| Layer      | Technology                                             |
|------------|--------------------------------------------------------|
| Frontend   | React 18, Vite                                         |
| Backend    | Java 21, Spring Boot 3.5 (Web, Data JPA, Validation, Actuator) |
| Database   | MySQL 8.4                                              |
| Build      | Maven (builds the React app too, via frontend-maven-plugin) |
| Deployment | AWS Elastic Beanstalk (Corretto 21) + Amazon RDS for MySQL |

## Architecture

```
 Browser
   │  HTTP
   ▼
┌──────────────────────────────────────────────┐
│  Spring Boot (one jar, port 8080 / EB 5000)  │
│                                              │
│  /            → React static files (SPA)     │
│  /api/**      → REST controllers             │
│  /actuator/** → health check                 │
│                                              │
│  Controller → Service → JPA Repository       │
└───────────────────────┬──────────────────────┘
                        │ JDBC (Hikari pool)
                        ▼
                  MySQL  `expenses` table
```

The React app is compiled during `mvn package` and copied into the jar as
static resources, so frontend and API share one origin. No CORS configuration
is needed in either development (Vite proxies `/api` to 8080) or production.

## Project layout

```
.
├── pom.xml                         Maven build (backend + triggers frontend build)
├── Procfile                        Start command for Elastic Beanstalk
├── .ebextensions/01-app.config     EB settings (health check path)
├── deploy/build-bundle.sh          Builds the EB deployment zip
├── src/main/java/com/example/expensetracker
│   ├── ExpenseTrackerApplication.java
│   ├── controller/ExpenseController.java   REST endpoints
│   ├── service/ExpenseService.java         Business logic + summary
│   ├── repository/ExpenseRepository.java   Spring Data JPA + filter query
│   ├── model/Expense.java, Category.java   JPA entity + enum
│   ├── exception/                          404 + validation → JSON errors
│   └── config/SpaWebConfig.java            index.html fallback for the SPA
├── src/main/resources/application.properties
└── frontend/                       React app (Vite)
    └── src/
        ├── App.jsx                 State, data loading, layout
        ├── api.js                  fetch() wrapper for /api
        ├── format.js               ₹ / date formatting (en-IN)
        └── components/             Summary, Filters, ExpenseForm, ExpenseList
```

## REST API

| Method | Path                              | Description                                   |
|--------|-----------------------------------|-----------------------------------------------|
| GET    | `/api/expenses`                   | List; optional `category`, `from`, `to` (ISO dates) |
| GET    | `/api/expenses/{id}`              | Get one                                       |
| POST   | `/api/expenses`                   | Create (returns 201 + `Location` header)      |
| PUT    | `/api/expenses/{id}`              | Update                                        |
| DELETE | `/api/expenses/{id}`              | Delete (204)                                  |
| GET    | `/api/expenses/summary`           | `{ total, count, byCategory }` for the same filters |
| GET    | `/api/categories`                 | Allowed category values                       |
| GET    | `/actuator/health`                | Health check                                  |

Example:

```bash
curl -X POST http://localhost:8080/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"title":"Groceries","amount":540.50,"category":"FOOD","date":"2026-09-27","notes":"Weekly shop"}'
```

Validation errors return `400` with a per-field map:

```json
{ "status": 400, "error": "Validation failed",
  "details": { "title": "Title is required", "amount": "Amount must be greater than 0" } }
```

## Run locally

Prerequisites: JDK 21+, Maven 3.9+, and a MySQL 8 server. Node is **not**
required for the Maven build (the plugin downloads its own copy), but is
handy for frontend hot-reload.

1. Start MySQL. With Docker/Finch:

   ```bash
   docker run -d --name et-mysql -p 3306:3306 \
     -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=expense_tracker \
     -e MYSQL_USER=expense -e MYSQL_PASSWORD=expense123 mysql:8.4
   ```

   Any MySQL works; the defaults the app expects are in
   `application.properties` (`localhost:3306`, db `expense_tracker`, user
   `expense` / `expense123`). Override with the `DB_*` environment variables.

2. Build and run:

   ```bash
   mvn package -DskipTests
   java -jar target/expense-tracker-1.0.0.jar
   ```

   Open <http://localhost:8080>. Hibernate creates the `expenses` table on
   first start (`spring.jpa.hibernate.ddl-auto=update`).

3. Frontend development with hot reload (optional): keep the jar running and

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Open <http://localhost:5173>; `/api` calls are proxied to 8080.

### Configuration

| Variable      | Default            | Purpose                                  |
|---------------|--------------------|------------------------------------------|
| `DB_HOST`     | `localhost`        | MySQL host                               |
| `DB_PORT`     | `3306`             | MySQL port                               |
| `DB_NAME`     | `expense_tracker`  | Schema (created if missing)              |
| `DB_USER`     | `expense`          | DB user                                  |
| `DB_PASSWORD` | `expense123`       | DB password                              |
| `DB_USE_SSL`  | `false`            | Set `true` for RDS                       |
| `PORT`        | `8080`             | HTTP port (Elastic Beanstalk sets 5000)  |

## Deploy to AWS (Elastic Beanstalk + ALB + RDS + ACM)

Live demo: <https://expenses.venkatgh.people.aws.dev>

```
 Browser ── HTTPS ──► Route 53 (alias) ──► Application Load Balancer
                                            │  443: ACM certificate
                                            │  80 : 301 → HTTPS
                                            ▼
                                   EC2 (t3.small) nginx:80 → Spring Boot:5000
                                            │  security group: app-sg
                                            ▼
                                   RDS MySQL 8.4 (db.t3.micro, private)
                                               security group: db-sg (3306 from app-sg only)
```

What gets created (us-east-1, default VPC):

- **RDS MySQL** `db.t3.micro`, not publicly accessible, security group
  `expense-tracker-db-sg` that allows 3306 only from the app's security group.
- **ACM certificate** for `expenses.<your-domain>` validated by a DNS CNAME
  in Route 53.
- **Elastic Beanstalk** application `expense-tracker`, load-balanced
  environment `expense-tracker-lb` (Application Load Balancer, 1–2 `t3.small`
  instances) on the Corretto 21 platform, HTTPS listener on 443 using the
  ACM certificate, security group `expense-tracker-app-sg`.
- **Route 53** alias `A` record pointing the hostname at the ALB; the port
  80 listener redirects to HTTPS.
- DB connection details are passed to the app as EB **environment
  properties**; nothing sensitive is in the repo.

Cost while running is roughly USD 45–55 per month (ALB ≈ $17, t3.small ≈ $15,
db.t3.micro ≈ $13, storage). Tear it down when not needed (below).

Two things that bit during the first deploy, worth knowing:

- **`PORT=5000` must be set explicitly.** EB's nginx proxies to port 5000,
  but with a `Procfile` the platform does not inject `PORT` into the process
  environment, so Spring Boot listened on 8080 and nginx returned 502. The
  environment property `PORT=5000` fixes it (`server.port=${PORT:8080}`).
- **`t3.micro` (1 GB) is too small** for Amazon Linux 2023 + the EB agents +
  a Spring Boot JVM; the instance starved and stopped reporting health.
  `t3.small` is the practical minimum.

### Steps

```bash
export AWS_DEFAULT_REGION=us-east-1
VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)

# 1. Security groups
APP_SG=$(aws ec2 create-security-group --group-name expense-tracker-app-sg \
  --description "Expense Tracker EB instances" --vpc-id $VPC --query GroupId --output text)
DB_SG=$(aws ec2 create-security-group --group-name expense-tracker-db-sg \
  --description "Expense Tracker RDS MySQL" --vpc-id $VPC --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $DB_SG \
  --ip-permissions "IpProtocol=tcp,FromPort=3306,ToPort=3306,UserIdGroupPairs=[{GroupId=$APP_SG}]"

# 2. RDS (takes ~5-10 minutes)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
aws rds create-db-instance --db-instance-identifier expense-tracker-db \
  --db-instance-class db.t3.micro --engine mysql --engine-version 8.4.9 \
  --allocated-storage 20 --storage-type gp3 \
  --master-username expense --master-user-password "$DB_PASSWORD" \
  --db-name expense_tracker --vpc-security-group-ids $DB_SG \
  --no-publicly-accessible --no-multi-az --backup-retention-period 1
aws rds wait db-instance-available --db-instance-identifier expense-tracker-db
DB_HOST=$(aws rds describe-db-instances --db-instance-identifier expense-tracker-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)

# 3. TLS certificate (DNS validation in Route 53)
DOMAIN=expenses.example.com
ZONE=$(aws route53 list-hosted-zones-by-name --dns-name example.com --query 'HostedZones[0].Id' --output text)
CERT_ARN=$(aws acm request-certificate --domain-name $DOMAIN --validation-method DNS --query CertificateArn --output text)
sleep 10
read RNAME RVALUE < <(aws acm describe-certificate --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]' --output text)
aws route53 change-resource-record-sets --hosted-zone-id $ZONE --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",
  \"ResourceRecordSet\":{\"Name\":\"$RNAME\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$RVALUE\"}]}}]}"
aws acm wait certificate-validated --certificate-arn $CERT_ARN

# 4. Build the bundle and upload it
./deploy/build-bundle.sh
BUCKET=$(aws elasticbeanstalk create-storage-location --query S3Bucket --output text)
aws s3 cp target/expense-tracker-eb.zip s3://$BUCKET/expense-tracker/v1.zip

# 5. EB application + version
aws elasticbeanstalk create-application --application-name expense-tracker
aws elasticbeanstalk create-application-version --application-name expense-tracker \
  --version-label v1 --source-bundle S3Bucket=$BUCKET,S3Key=expense-tracker/v1.zip

# 6. EB environment (option settings as JSON; see deploy/eb-options.example.json)
aws elasticbeanstalk create-environment --application-name expense-tracker \
  --environment-name expense-tracker-lb --version-label v1 \
  --solution-stack-name "64bit Amazon Linux 2023 v4.12.9 running Corretto 21" \
  --option-settings file://deploy/eb-options.json
aws elasticbeanstalk wait environment-exists --environment-names expense-tracker-lb

# 7. DNS alias to the ALB + HTTP -> HTTPS redirect
LB_ARN=$(aws elasticbeanstalk describe-environment-resources --environment-name expense-tracker-lb \
  --query 'EnvironmentResources.LoadBalancers[0].Name' --output text)
read LB_DNS LB_ZONE < <(aws elbv2 describe-load-balancers --load-balancer-arns $LB_ARN \
  --query 'LoadBalancers[0].[DNSName,CanonicalHostedZoneId]' --output text)
aws route53 change-resource-record-sets --hosted-zone-id $ZONE --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",
  \"ResourceRecordSet\":{\"Name\":\"$DOMAIN\",\"Type\":\"A\",\"AliasTarget\":{\"HostedZoneId\":\"$LB_ZONE\",\"DNSName\":\"$LB_DNS\",\"EvaluateTargetHealth\":false}}}]}"
L80=$(aws elbv2 describe-listeners --load-balancer-arn $LB_ARN --query 'Listeners[?Port==`80`].ListenerArn' --output text)
aws elbv2 modify-listener --listener-arn $L80 \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

`deploy/eb-options.example.json` shows every option used; copy it to
`deploy/eb-options.json` and fill in the VPC, subnets, `APP_SG`, `CERT_ARN`,
`DB_HOST` and `DB_PASSWORD`. That file is git-ignored because it contains the
password.

To ship a new version: run `./deploy/build-bundle.sh`, upload the zip with a
new key, `create-application-version` with a new label, then
`aws elasticbeanstalk update-environment --environment-name expense-tracker-lb --version-label v2`.

### Teardown

```bash
aws elasticbeanstalk terminate-environment --environment-name expense-tracker-lb
aws elasticbeanstalk wait environment-terminated --environment-names expense-tracker-lb
aws elasticbeanstalk delete-application --application-name expense-tracker
aws rds delete-db-instance --db-instance-identifier expense-tracker-db --skip-final-snapshot
aws rds wait db-instance-deleted --db-instance-identifier expense-tracker-db
aws ec2 delete-security-group --group-name expense-tracker-db-sg
aws ec2 delete-security-group --group-name expense-tracker-app-sg
# Then delete the Route 53 A record + validation CNAME, and the ACM certificate.
```

## Things worth knowing (interview talking points)

- **Why one jar?** Simplest deployable unit; no CORS, one health check, one
  scaling unit. The trade-off is that a frontend-only change still rebuilds
  the backend.
- **Why env vars for DB config?** The same artifact runs locally and in AWS;
  secrets stay out of source control (12-factor config).
- **Why `ddl-auto=update`?** Fine for a learning project. A production app
  would version the schema with Flyway or Liquibase.
- **Why `BigDecimal` for money?** `double` loses precision; `DECIMAL(12,2)`
  in MySQL matches it exactly.
- **Where is validation?** Bean Validation annotations on the entity,
  enforced by `@Valid` in the controller, turned into a field-level JSON
  error map by `GlobalExceptionHandler`. The React form displays them
  under the matching inputs.
- **SPA fallback:** `SpaWebConfig` returns `index.html` for unknown
  non-API paths so a browser refresh on a client route does not 404.
