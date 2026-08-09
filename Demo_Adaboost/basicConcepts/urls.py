from django.urls import path

from . import views

urlpatterns = [
    path('', views.predictor, name='predictor'),
    path('api/schema/', views.api_schema, name='api-schema'),
    path('api/predict/', views.api_predict, name='api-predict'),
]
