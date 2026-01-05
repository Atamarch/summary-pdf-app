package handler

import (
	"app/src/service"
	"app/src/utils"
	
	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
)

type PDFHandler struct {
	Service service.PDFService
	Log     *logrus.Logger
}

func NewPDFHandler(service service.PDFService) *PDFHandler {
	return &PDFHandler{
		Service: service,
		Log:     utils.Log,
	}
}

func (h *PDFHandler) ViewPDF(c *fiber.Ctx) error {
	id := c.Params("id")
	return h.Service.ViewPDF(c, id)
}