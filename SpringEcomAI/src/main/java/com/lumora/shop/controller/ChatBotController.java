package com.lumora.shop.controller;

import com.lumora.shop.service.ChatBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatBotController {

    @Autowired
    private ChatBotService chatBotService;

    @GetMapping("/ask")
    public ResponseEntity<String> askBot(@RequestParam String message, Authentication authentication) {
        String reply = chatBotService.getBotResponse(message, authentication.getName());
        return ResponseEntity.ok(reply);
    }
}
