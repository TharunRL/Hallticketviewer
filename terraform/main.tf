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
# 4. Create the App Service Plan
# This defines the underlying compute resources. We're using the F1 Free tier. 💰
resource "azurerm_service_plan" "plan" {
  name                = "react-express-free-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "F1" # This is the magic key for the FREE tier.
}

# ---
# 5. Create the Web App for the React Frontend container
resource "azurerm_linux_web_app" "frontend" {
  # This name also needs to be globally unique as it forms a URL.
  name                = "hallticket-frontend-app-123" 
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.plan.location
  service_plan_id     = azurerm_service_plan.plan.id

  # This section tells App Service how to find your Docker image.
  # The actual image tag will be supplied by your CI/CD pipeline during deployment.
  site_config {
    always_on = false # Required for the Free (F1) tier
  }

  identity {
    type = "SystemAssigned"
  }
}

# ---
# 6. Create the Web App for the Express Backend container
resource "azurerm_linux_web_app" "backend" {
  # This name also needs to be globally unique.
  name                = "hallticket-backend-app-123"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.plan.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    always_on = false # Required for the Free (F1) tier

    # These are environment variables for your backend container.
    # Your Express app can access these to know where the frontend is (for CORS)
    # or to get database secrets.
    
  }
app_settings = {
      "FRONTEND_URL" = "https://${azurerm_linux_web_app.frontend.default_hostname}"
    }
  identity {
    type = "SystemAssigned"
  }
}

# ---
# 7. Grant App Services Permission to Pull from ACR
# This creates a role assignment that securely allows your App Services
# to pull the container images from your private ACR without needing passwords.
resource "azurerm_role_assignment" "acrpull_frontend" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id
}

resource "azurerm_role_assignment" "acrpull_backend" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
}