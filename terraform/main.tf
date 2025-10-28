# 1. Configure the Azure Provider
# This block tells Terraform you're working with Microsoft Azure.
provider "azurerm" {
  features {}
  subscription_id = "c650f963-8eec-48ce-8ac0-029ddfc0f1dc"
}

# ---
# 2. Define a Resource Group
# A resource group is a logical container for all your project's resources.
resource "azurerm_resource_group" "rg" {
  name     = "react-express-rg" # You can keep this or change it
  location = "Central India"          # Choose an Azure region close to you
}

# ---
# 3. Create the Azure Container Registry (ACR)
# This is a private Docker registry where your frontend and backend images will be stored.
resource "azurerm_container_registry" "acr" {
  # This name MUST be globally unique across all of Azure.
  name                = "hallticketviewercontainer289" 
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic" # The 'Basic' tier is very cheap, perfect for your student credit.
  admin_enabled       = true    # Allows easy login from your CI/CD pipeline.
}

# ---
# 4. Create a Log Analytics Workspace
# Container Apps require a Log Analytics workspace for logging and monitoring
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "hallticket-logs"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# ---
# 4a. Create Application Insights
# Application Insights provides application performance monitoring and telemetry
resource "azurerm_application_insights" "appinsights" {
  name                = "hallticket-appinsights"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "web"
}

# ---
# 5. Create the Container Apps Environment
# This is the secure boundary and networking configuration for your Container Apps
resource "azurerm_container_app_environment" "env" {
  name                       = "hallticket-containerapp-env"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
}

# ---
# 6. Create the Container App for the React Frontend
resource "azurerm_container_app" "frontend" {
  name                         = "hallticket-frontend"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode                = "Single"

  template {
    container {
      name   = "frontend"
      image  = "${azurerm_container_registry.acr.login_server}/frontend:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }

    min_replicas = 0
    max_replicas = 1
  }

  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  identity {
    type = "SystemAssigned"
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# ---
# 7. Create the Container App for the Express Backend
resource "azurerm_container_app" "backend" {
  name                         = "hallticket-backend"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode                = "Single"

  template {
    container {
      name   = "backend"
      image  = "${azurerm_container_registry.acr.login_server}/backend:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "FRONTEND_URL"
        value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
      }

      env {
        name  = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        value = azurerm_application_insights.appinsights.connection_string
      }
    }

    min_replicas = 0
    max_replicas = 1
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  identity {
    type = "SystemAssigned"
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }
}

# ---
# 8. Grant Container Apps Permission to Pull from ACR
# This creates a role assignment that securely allows your Container Apps
# to pull the container images from your private ACR without needing passwords.
resource "azurerm_role_assignment" "acrpull_frontend" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.frontend.identity[0].principal_id
}

resource "azurerm_role_assignment" "acrpull_backend" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.backend.identity[0].principal_id
}

# ---
# 9. Outputs
# These will display important information after deployment
output "frontend_url" {
  description = "URL of the frontend Container App"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "backend_url" {
  description = "URL of the backend Container App"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "acr_login_server" {
  description = "Login server for the Container Registry"
  value       = azurerm_container_registry.acr.login_server
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.rg.name
}

output "appinsights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.appinsights.connection_string
  sensitive   = true
}

output "appinsights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.appinsights.instrumentation_key
  sensitive   = true
}